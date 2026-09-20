"""Citizen grievance redressal with SLA countdown + auto-escalation.

- Citizens: file a grievance, track it, confirm closure.
- Officers: triage queue, respond/resolve; overdue Open/InReview cases
  auto-escalate to the Collector on read (audited + citizen notified).
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_admin, get_current_officer_reader, get_current_user, get_db
from app.models.grievance import SLA_DAYS, Grievance, GrievanceStatus
from app.models.user import User
from app.schemas.grievance import CATEGORIES, GrievanceCreate, GrievanceOut, GrievanceRespond
from app.services.audit import log_event
from app.utils.notification import dispatch_notification

router = APIRouter(prefix="/grievances", tags=["grievances"])

_OPEN = (GrievanceStatus.open, GrievanceStatus.in_review)


def _out(g: Grievance) -> GrievanceOut:
    overdue = g.status in (*_OPEN, GrievanceStatus.escalated) and g.sla_due < datetime.now()
    return GrievanceOut(
        id=g.id, citizen_id=g.citizen_id,
        citizen_name=g.citizen.name if g.citizen else None,
        citizen_phone=g.citizen.phone if g.citizen else None,
        category=g.category, subject=g.subject, description=g.description or "",
        application_id=g.application_id, status=g.status.value,
        officer_response=g.officer_response, responded_by=g.responded_by,
        sla_due=g.sla_due, escalated_at=g.escalated_at,
        is_overdue=overdue, created_at=g.created_at, updated_at=g.updated_at,
    )


def _maybe_escalate(db: Session, officer: User, rows: list[Grievance]) -> int:
    """Flip overdue Open/InReview cases to Escalated (audited + notified)."""
    now = datetime.now()
    n = 0
    for g in rows:
        if g.status in _OPEN and g.escalated_at is None and g.sla_due < now:
            g.status = GrievanceStatus.escalated
            g.escalated_at = now
            n += 1
            log_event(db, actor=officer, action="grievance.escalated",
                      entity_type="grievance", entity_id=str(g.id),
                      details={"reason": f"SLA breached ({SLA_DAYS}d)", "sla_due": g.sla_due.isoformat()})
            if g.citizen:
                dispatch_notification(
                    db, g.citizen, "Grievance escalated to Collector",
                    f"Your grievance #{g.id} ({g.subject}) crossed the {SLA_DAYS}-day SLA "
                    "and is now escalated to the Collector for priority action.")
    if n:
        db.commit()
    return n


# ── Citizen ──────────────────────────────────────────────────────────────
@router.post("", response_model=GrievanceOut, summary="File a grievance (citizen)")
def file_grievance(payload: GrievanceCreate, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    cat = payload.category.strip().lower() if payload.category else "other"
    if cat not in CATEGORIES:
        cat = "other"
    g = Grievance(
        citizen_id=user.id, category=cat,
        subject=payload.subject.strip(), description=(payload.description or "").strip(),
        application_id=payload.application_id,
        status=GrievanceStatus.open,
        sla_due=datetime.now() + timedelta(days=SLA_DAYS),
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    log_event(db, actor=user, action="grievance.filed",
              entity_type="grievance", entity_id=str(g.id),
              details={"category": cat, "sla_days": SLA_DAYS})
    dispatch_notification(db, user, "Grievance received",
                          f"Grievance #{g.id} registered. We will respond within {SLA_DAYS} days.")
    g = db.query(Grievance).options(joinedload(Grievance.citizen)).filter(Grievance.id == g.id).first()
    return _out(g)


@router.get("/me", response_model=list[GrievanceOut], summary="My grievances (citizen)")
def my_grievances(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (db.query(Grievance).options(joinedload(Grievance.citizen))
            .filter(Grievance.citizen_id == user.id)
            .order_by(Grievance.created_at.desc()).all())
    return [_out(g) for g in rows]


@router.patch("/{gid}/close", response_model=GrievanceOut, summary="Confirm closure (citizen)")
def close_grievance(gid: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    g = db.query(Grievance).options(joinedload(Grievance.citizen)).filter(Grievance.id == gid).first()
    if g is None or g.citizen_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance not found")
    if g.status != GrievanceStatus.resolved:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Only a resolved grievance can be closed by the citizen")
    g.status = GrievanceStatus.closed
    db.commit()
    log_event(db, actor=user, action="grievance.closed",
              entity_type="grievance", entity_id=str(g.id))
    return _out(g)


# ── Officer ──────────────────────────────────────────────────────────────
@router.get("", response_model=list[GrievanceOut], summary="Grievance queue (officer)")
def list_grievances(
    status_: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    officer: User = Depends(get_current_officer_reader),
):
    q = db.query(Grievance).options(joinedload(Grievance.citizen))
    if status_:
        try:
            q = q.filter(Grievance.status == GrievanceStatus(status_))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"Unknown status '{status_}'")
    rows = q.order_by(Grievance.created_at.desc()).limit(500).all()
    _maybe_escalate(db, officer, rows)
    return [_out(g) for g in rows]


@router.patch("/{gid}/respond", response_model=GrievanceOut, summary="Respond / resolve (officer)")
def respond_grievance(gid: int, payload: GrievanceRespond,
                      db: Session = Depends(get_db),
                      officer: User = Depends(get_current_admin)):
    g = db.query(Grievance).options(joinedload(Grievance.citizen)).filter(Grievance.id == gid).first()
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance not found")
    if g.status == GrievanceStatus.closed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Grievance already closed")
    g.officer_response = payload.response.strip()
    g.responded_by = officer.email
    g.status = GrievanceStatus.resolved if payload.resolve else GrievanceStatus.in_review
    db.commit()
    action = "grievance.resolved" if payload.resolve else "grievance.responded"
    log_event(db, actor=officer, action=action,
              entity_type="grievance", entity_id=str(g.id))
    if g.citizen:
        dispatch_notification(
            db, g.citizen,
            f"Grievance #{g.id} {'resolved' if payload.resolve else 'updated'}",
            f"Officer response: {g.officer_response[:300]}")
    return _out(g)
