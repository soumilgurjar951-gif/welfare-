"""Append-only audit writer (PRD §13) with a SHA-256 hash chain.

Every entry links to the previous entry's hash, so any tampering with
history breaks the chain (verifiable via verify_chain / GET /api/audit/verify).
No update/delete path exists for this table.

entry_hash = sha256(prev_hash | id | actor_email | actor_role | action |
                    entity_type | entity_id | details_json)
Genesis row uses prev_hash = "GENESIS".
"""

import hashlib
import json

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.gap_case import AuditEvent
from app.models.user import User

GENESIS = "GENESIS"
ALGORITHM = "sha256-chain-v1"


def _payload(prev_hash: str, ev: AuditEvent) -> str:
    details = json.dumps(ev.details or {}, sort_keys=True, ensure_ascii=True, default=str)
    return "|".join([
        prev_hash or GENESIS,
        str(ev.id),
        ev.actor_email or "",
        ev.actor_role or "",
        ev.action or "",
        ev.entity_type or "",
        ev.entity_id or "",
        details,
    ])


def _hash(prev_hash: str, ev: AuditEvent) -> str:
    return hashlib.sha256(_payload(prev_hash, ev).encode("utf-8")).hexdigest()


def backfill_chain(db: Session) -> None:
    """Hash rows written before the chain feature, oldest-first (idempotent)."""
    rows = (
        db.query(AuditEvent)
        .filter(AuditEvent.entry_hash.is_(None))
        .order_by(AuditEvent.id.asc())
        .all()
    )
    if not rows:
        return
    last = (
        db.query(AuditEvent)
        .filter(AuditEvent.entry_hash.is_not(None))
        .order_by(AuditEvent.id.desc())
        .first()
    )
    prev = last.entry_hash if last and last.entry_hash else GENESIS
    for ev in rows:
        ev.prev_hash = prev
        # id is already assigned for persisted rows
        ev.entry_hash = _hash(prev, ev)
        prev = ev.entry_hash
    db.commit()


def log_event(
    db: Session,
    *,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: str = "",
    details: dict | None = None,
) -> AuditEvent:
    backfill_chain(db)
    prev_row = (
        db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
    )
    prev = prev_row.entry_hash if prev_row and prev_row.entry_hash else GENESIS
    ev = AuditEvent(
        actor_email=actor.email,
        actor_role=actor.role.value,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details or {},
        prev_hash=prev,
    )
    db.add(ev)
    db.flush()  # assign id before hashing
    ev.entry_hash = _hash(prev, ev)
    db.commit()
    db.refresh(ev)
    return ev


def verify_chain(db: Session, limit: int = 5000) -> dict:
    """Recompute the chain newest-first window; return integrity report."""
    backfill_chain(db)  # self-healing: hash legacy rows before verifying
    total = db.query(func.count(AuditEvent.id)).scalar() or 0
    rows = (
        db.query(AuditEvent).order_by(AuditEvent.id.asc()).limit(limit).all()
    )
    prev = GENESIS
    for ev in rows:
        if not ev.entry_hash or ev.prev_hash != prev:
            return {
                "ok": False, "algorithm": ALGORITHM,
                "checked": rows.index(ev), "total": total,
                "broken_at": ev.id,
                "message": f"Chain broken at entry #{ev.id} (missing/altered link).",
            }
        if ev.entry_hash != _hash(prev, ev):
            return {
                "ok": False, "algorithm": ALGORITHM,
                "checked": rows.index(ev), "total": total,
                "broken_at": ev.id,
                "message": f"Entry #{ev.id} content does not match its hash (tampered).",
            }
        prev = ev.entry_hash
    return {
        "ok": True, "algorithm": ALGORITHM,
        "checked": len(rows), "total": total, "broken_at": None,
        "message": f"Chain intact — {len(rows)}/{total} entries verified.",
    }
