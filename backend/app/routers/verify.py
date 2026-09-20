"""Public QR verification for action memoranda (no auth).

Anyone scanning the QR on a memo lands on /verify/{code}, which calls
this endpoint. Only non-sensitive fields are exposed — no citizen names,
no Aadhaar, officer identity masked.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db
from app.models.gap_case import GapCase

router = APIRouter(prefix="/verify", tags=["public-verify"])


class MemoVerification(BaseModel):
    valid: bool
    tracking_code: str
    scheme: str | None = None
    status: str | None = None
    ai_label: str | None = None
    district: str | None = None
    decided_at: str | None = None
    issued_by_masked: str | None = None
    message: str


def _mask(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    return f"{local[:2]}***@{domain}"


@router.get("/memo/{code}", response_model=MemoVerification,
            summary="Verify an action memorandum by tracking code")
def verify_memo(code: str, db: Session = Depends(get_db)):
    code = (code or "").strip().upper()
    g = (db.query(GapCase).options(joinedload(GapCase.scheme))
         .filter(GapCase.tracking_code == code).first())
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="No memorandum found for this tracking code")
    return MemoVerification(
        valid=True, tracking_code=g.tracking_code or code,
        scheme=g.scheme.name if g.scheme else None,
        status=g.status.value, ai_label=g.label.value,
        district=g.district,
        decided_at=g.decided_at.isoformat() if g.decided_at else None,
        issued_by_masked=_mask(g.decided_by),
        message="Genuine memorandum issued through Scheme Sync officer workflow.",
    )
