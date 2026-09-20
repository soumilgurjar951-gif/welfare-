"""PRD Workflow domain: welfare gap cases + immutable audit events.

AI flags only — officers decide. Every prediction carries model/rule version,
confidence, evidence, freshness and limitations (PRD §8-9).
"""

import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GapLabel(str, enum.Enum):
    potentially_eligible = "Potentially Eligible"
    verification_required = "Verification Required"
    insufficient_data = "Insufficient Data"
    conflict_detected = "Conflict Detected"
    not_supported = "Not Supported"


class GapStatus(str, enum.Enum):
    open = "Open"
    verified = "Verified"
    false_positive = "FalsePositive"
    needs_more_data = "NeedsMoreData"
    closed = "Closed"


class GapCase(Base):
    """One AI-detected welfare gap dossier (PRD §5-6)."""

    __tablename__ = "gap_cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    scheme_id: Mapped[int] = mapped_column(
        ForeignKey("schemes.id", ondelete="RESTRICT"), nullable=False
    )

    # Display-only identity (never raw Aadhaar)
    citizen_name: Mapped[str] = mapped_column(String(120), nullable=False)
    aadhaar_masked: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # MP demo geography (PRD §15)
    district: Mapped[str] = mapped_column(String(80), nullable=False, default="Bhopal")
    block: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    village: Mapped[str] = mapped_column(String(80), nullable=False, default="")

    # AI finding (§8-9)
    label: Mapped[GapLabel] = mapped_column(Enum(GapLabel), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0-100
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0-100
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")

    evidence: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)  # matched records
    eligibility_signals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    rule_version: Mapped[str] = mapped_column(String(40), nullable=False, default="rules-v1.0-mvp")
    model_version: Mapped[str] = mapped_column(String(60), nullable=False, default="rule-fallback-v1")
    anomaly: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    top_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)

    data_freshness: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # source systems
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Officer workflow (§5 Verification + §6 dossier)
    status: Mapped[GapStatus] = mapped_column(Enum(GapStatus), nullable=False, default=GapStatus.open)
    assignment: Mapped[str | None] = mapped_column(String(255), nullable=True)  # officer email
    sla_due: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verification_history: Mapped[list | None] = mapped_column(JSON, nullable=True)

    tracking_code: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    scheme: Mapped["Scheme"] = relationship("Scheme")

    __table_args__ = (
        Index("ix_gap_cases_status", "status"),
        Index("ix_gap_cases_label", "label"),
        Index("ix_gap_cases_scheme", "scheme_id"),
        Index("ix_gap_cases_district", "district"),
        Index("ix_gap_cases_priority", "priority"),
    )


class AuditEvent(Base):
    """Immutable/tamper-evident audit trail (PRD §13).

    Append-only: no UPDATE/DELETE endpoint exposes this table.
    Covers login, reads, exports, verification and admin actions.
    """

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(40), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)  # e.g. gap.verify
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)  # gap_case|export|auth|...
    entity_id: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Hash chain (tamper-evident): entry_hash = sha256(prev_hash | id | actor |
    # action | entity | details). Genesis row uses prev_hash = "GENESIS".
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entry_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_actor", "actor_email"),
        Index("ix_audit_created", "created_at"),
    )
