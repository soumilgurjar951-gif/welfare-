"""Citizen grievance redressal with SLA countdown + auto-escalation.

Lifecycle: Open -> InReview -> Resolved -> Closed (citizen confirms).
Any Open/InReview case past its SLA due date auto-escalates to the
Collector on next officer read (see routers/grievances.py).
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

SLA_DAYS = 7


class GrievanceStatus(str, enum.Enum):
    open = "Open"
    in_review = "InReview"
    resolved = "Resolved"
    escalated = "Escalated"
    closed = "Closed"


class Grievance(Base):
    __tablename__ = "grievances"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    citizen_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    category: Mapped[str] = mapped_column(String(60), nullable=False, default="other")
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    application_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[GrievanceStatus] = mapped_column(
        Enum(GrievanceStatus), nullable=False, default=GrievanceStatus.open
    )
    officer_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    sla_due: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    citizen: Mapped["User"] = relationship("User")

    __table_args__ = (
        Index("ix_grievances_citizen", "citizen_id"),
        Index("ix_grievances_status", "status"),
        Index("ix_grievances_sla", "sla_due"),
    )
