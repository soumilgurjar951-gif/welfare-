"""Application model: one citizen application for one scheme."""

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ApplicationStatus(str, enum.Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scheme_id: Mapped[int] = mapped_column(ForeignKey("schemes.id", ondelete="RESTRICT"), nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.pending
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    benefit_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="applications", foreign_keys=[user_id])
    admin: Mapped["User | None"] = relationship(
        "User", back_populates="decided_applications", foreign_keys=[admin_id]
    )
    scheme: Mapped["Scheme"] = relationship("Scheme", back_populates="applications")
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    logs: Mapped[list["AdminLog"]] = relationship(
        "AdminLog", back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        Index("ix_applications_user", "user_id"),
        Index("ix_applications_scheme", "scheme_id"),
        Index("ix_applications_status", "status"),
        Index("ix_applications_created", "created_at"),
    )
