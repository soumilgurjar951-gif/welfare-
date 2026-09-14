"""Scheme model."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    eligibility: Mapped[str] = mapped_column(Text, nullable=False, default="")
    required_documents: Mapped[str | None] = mapped_column(Text, nullable=True, default="Aadhaar Card, Income Certificate, Bank Passbook")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    applications: Mapped[list["Application"]] = relationship("Application", back_populates="scheme")

