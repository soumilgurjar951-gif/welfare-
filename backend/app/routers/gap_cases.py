"""Gap-case queue: list, dossier, verify / false-positive / request-info (PRD §5-6).

Human-in-the-loop is mandatory — every decision needs a reason + identity +
timestamp and is written to the append-only audit trail.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_admin, get_current_officer_reader, get_db
from app.models.gap_case import GapCase, GapStatus
from app.models.user import User
from app.schemas.gap_case import (
    GapCaseOut,
    GapFlagRequest,
    GapRequestInfoRequest,
    GapVerifyRequest,
)
from app.services.audit import log_event

router = APIRouter(prefix="/gap-cases", tags=["gap-cases"])

_TRACK_SALT = "scheme-sync-mvp"


def _out(g: GapCase) -> GapCaseOut:
    data = GapCaseOut.model_validate(g)
    data.scheme_name = g.scheme.name if g.scheme else None
    data.label = g.label.value
    data.status = g.status.value
    return data


def _history(g: GapCase) -> list:
    return list(g.verification_history or [])


def _decide(
    db: Session,
    case_id: int,
    officer: User,
    to_status: GapStatus,
    reason: str,
    assignment: str | None = None,
) -> GapCaseOut:
    g = db.query(GapCase).filter(GapCase.id == case_id).first()
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gap case not found")
    if g.status in (GapStatus.verified, GapStatus.closed):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case is already {g.status.value}",
        )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    g.status = to_status
    g.decision_reason = reason.strip()
    g.decided_by = officer.email
    g.decided_at = now
    if assignment:
        g.assignment = assignment.strip()
    if not g.tracking_code:
        import hashlib

        g.tracking_code = "SS-" + hashlib.sha256(
            f"{g.id}-{g.scheme_id}-{_TRACK_SALT}".encode()
        ).hexdigest()[:10].upper()
    hist = _history(g)
    hist.append({
        "action": to_status.value,
        "by": officer.email,
        "role": officer.role.value,
        "reason": reason.strip(),
        "at": now.isoformat(),
    })
    g.verification_history = hist
    db.commit()
    db.refresh(g)
    log_event(db, actor=officer, action=f"gap.{to_status.value.lower()}",
              entity_type="gap_case", entity_id=str(g.id),
              details={"reason": reason.strip(), "priority": g.priority})
    return _out(g)


@router.get("", response_model=dict, summary="Verification queue (filterable, paginated)")
def list_cases(
    label: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    scheme_id: int | None = None,
    district: str | None = None,
    min_priority: int | None = Query(default=None, ge=0, le=100),
    search: str | None = Query(default=None, description="Citizen name / village / block"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    officer: User = Depends(get_current_officer_reader),
):
    # Guard: full 12-digit Aadhaar must never be a search key (PRD §13).
    if search and search.strip().isdigit() and len(search.strip()) == 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Use masked ID (XXXX-XXXX-1234), not full Aadhaar")
    q = db.query(GapCase).options(joinedload(GapCase.scheme))
    if label:
        q = q.filter(GapCase.label == label)
    if status_:
        try:
            q = q.filter(GapCase.status == GapStatus(status_))
        except ValueError:
            pass
    if scheme_id:
        q = q.filter(GapCase.scheme_id == scheme_id)
    if district:
        q = q.filter(GapCase.district.ilike(f"%{district.strip()}%"))
    if min_priority is not None:
        q = q.filter(GapCase.priority >= min_priority)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(GapCase.citizen_name.ilike(like),
                         GapCase.village.ilike(like), GapCase.block.ilike(like)))
    total = q.count()
    rows = (q.order_by(GapCase.priority.desc(), GapCase.created_at.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    ai_candidates = db.query(GapCase).filter(GapCase.status == GapStatus.open).count()
    verified = db.query(GapCase).filter(
        GapCase.status.in_([GapStatus.verified, GapStatus.false_positive, GapStatus.closed])
    ).count()
    return {"total": total, "page": page, "page_size": page_size,
            "ai_candidates": ai_candidates, "officer_verified": verified,
            "items": [_out(g) for g in rows]}


@router.get("/{case_id}", response_model=GapCaseOut, summary="Case dossier (PRD §6)")
def dossier(case_id: int, db: Session = Depends(get_db),
            officer: User = Depends(get_current_officer_reader)):
    g = (db.query(GapCase).options(joinedload(GapCase.scheme))
         .filter(GapCase.id == case_id).first())
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gap case not found")
    log_event(db, actor=officer, action="gap.read",
              entity_type="gap_case", entity_id=str(g.id))
    return _out(g)


@router.post("/{case_id}/verify", response_model=GapCaseOut, summary="Officer verifies the gap")
def verify(case_id: int, payload: GapVerifyRequest, db: Session = Depends(get_db),
           officer: User = Depends(get_current_admin)):
    return _decide(db, case_id, officer, GapStatus.verified,
                   payload.decision_reason, payload.assignment)


@router.post("/{case_id}/false-positive", response_model=GapCaseOut, summary="Flag as false positive")
def false_positive(case_id: int, payload: GapFlagRequest, db: Session = Depends(get_db),
                   officer: User = Depends(get_current_admin)):
    return _decide(db, case_id, officer, GapStatus.false_positive, payload.decision_reason)


@router.post("/{case_id}/request-info", response_model=GapCaseOut, summary="Needs more data")
def request_info(case_id: int, payload: GapRequestInfoRequest, db: Session = Depends(get_db),
                 officer: User = Depends(get_current_admin)):
    return _decide(db, case_id, officer, GapStatus.needs_more_data,
                   payload.decision_reason, payload.assignment)
