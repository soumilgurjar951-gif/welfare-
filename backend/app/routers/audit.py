"""Tamper-evident audit trail reads (officer read gate, PRD §13).

Writes happen implicitly via log_event() across routers; these endpoints
expose the hash-chained trail + one-click integrity verification.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.deps import get_current_officer_reader, get_db
from app.models.gap_case import AuditEvent
from app.models.user import User
from app.services.audit import ALGORITHM, verify_chain

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_email: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str
    details: dict | None = None
    prev_hash: str | None = None
    entry_hash: str | None = None
    created_at: datetime


class ChainReport(BaseModel):
    ok: bool
    algorithm: str = ALGORITHM
    checked: int
    total: int
    broken_at: int | None = None
    message: str


@router.get("/events", response_model=list[AuditEventOut], summary="Hash-chained audit events")
def list_events(limit: int = Query(default=100, le=500),
                db: Session = Depends(get_db),
                officer: User = Depends(get_current_officer_reader)):
    rows = (db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(limit).all())
    return [AuditEventOut.model_validate(r) for r in rows]


@router.get("/verify", response_model=ChainReport, summary="Verify hash-chain integrity")
def verify(db: Session = Depends(get_db),
           officer: User = Depends(get_current_officer_reader)):
    return ChainReport(**verify_chain(db))
