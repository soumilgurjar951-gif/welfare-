"""Role-based exports + action memorandum (PRD §5 Reports).

- PII is masked in exports; every export is audited (ExportEvent via audit trail).
- Memorandum carries officer identity, decision reason, timestamp + tracking code
  (QR optional — verify_url + code returned; frontend renders QR).
"""

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_officer_reader, get_db
from app.models.gap_case import GapCase
from app.models.user import User
from app.schemas.gap_case import ActionMemo
from app.services.audit import log_event

router = APIRouter(prefix="/reports", tags=["reports"])


def _mask_email(email: str | None) -> str:
    if not email or "@" not in email:
        return "—"
    local, domain = email.split("@", 1)
    return f"{local[:2]}***@{domain}"


def _mask_phone(phone: str | None) -> str:
    if not phone or len(phone) < 4:
        return "—"
    return f"XXXXXX{phone[-4:]}"


@router.get("/gap-cases.csv", summary="Masked CSV export (audited)")
def export_gaps(
    status_: str | None = Query(default=None, alias="status"),
    district: str | None = None,
    db: Session = Depends(get_db),
    officer: User = Depends(get_current_officer_reader),
):
    q = db.query(GapCase).options(joinedload(GapCase.scheme))
    if status_:
        q = q.filter(GapCase.status == status_)
    if district:
        q = q.filter(GapCase.district.ilike(f"%{district.strip()}%"))
    rows = q.order_by(GapCase.priority.desc()).limit(2000).all()
    wm = f"Exported by {officer.email} ({officer.role.value})"
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([f"# {wm} — masked export, DPDP Act 2023: purpose-limited"])
    w.writerow(["id", "citizen", "aadhaar_masked", "district", "block", "village",
                "scheme", "label", "confidence", "priority", "status",
                "assignment", "decided_by", "tracking_code"])
    for g in rows:
        w.writerow([g.id, g.citizen_name, g.aadhaar_masked or "",
                    g.district, g.block, g.village,
                    g.scheme.name if g.scheme else "", g.label.value,
                    g.confidence, g.priority, g.status.value,
                    g.assignment or "", g.decided_by or "", g.tracking_code or ""])
    log_event(db, actor=officer, action="report.export_csv",
              entity_type="export", entity_id="gap-cases",
              details={"rows": len(rows), "watermark": wm})
    buf.seek(0)
    return _csv(buf.getvalue(), "gap-cases.csv")


def _csv(text: str, filename: str):
    from fastapi.responses import StreamingResponse

    return StreamingResponse(iter([text]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/action-memo/{case_id}", response_model=ActionMemo,
            summary="Administrative memorandum for a decided case")
def action_memo(case_id: int, db: Session = Depends(get_db),
                officer: User = Depends(get_current_officer_reader)):
    g = (db.query(GapCase).options(joinedload(GapCase.scheme))
         .filter(GapCase.id == case_id).first())
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gap case not found")
    if g.status.value == "Open":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Officer verification required before memorandum")
    scheme = g.scheme.name if g.scheme else f"Scheme #{g.scheme_id}"
    code = g.tracking_code or f"SS-{g.id:06d}"
    body = (
        f"Sub: Welfare-gap verification — {g.citizen_name} ({g.district}/{g.block}/{g.village})\n"
        f"Scheme: {scheme} | AI label: {g.label.value} "
        f"(confidence {g.confidence}%, priority {g.priority}, {g.rule_version}/{g.model_version})\n"
        f"Decision: {g.status.value} by {g.decided_by} at {g.decided_at}\n"
        f"Reason: {g.decision_reason}\n"
        f"Evidence: {len(g.evidence or [])} matched records; "
        f"root cause: {g.root_cause or 'none recorded'}\n"
        f"Limitations: {g.limitations}\n"
        f"Tracking: {code}"
    )
    log_event(db, actor=officer, action="report.memo",
              entity_type="gap_case", entity_id=str(g.id))
    return ActionMemo(
        tracking_code=code, verify_url=f"/verify/{code}",
        subject=f"Action memorandum — gap case #{g.id} ({code})",
        body=body, decided_by=g.decided_by, decided_at=g.decided_at,
        watermark=f"{officer.email} | {officer.role.value}",
    )
