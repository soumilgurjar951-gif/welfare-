"""User model: citizens + admins in one table, role-separated."""

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    citizen = "citizen"
    admin = "admin"


class IdType(str, enum.Enum):
    aadhaar = "aadhaar"
    voter = "voter"
    pan = "pan"
    dl = "dl"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Aadhaar is never stored in plain text: only salted-context SHA-256 + masked form.
    aadhaar_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    aadhaar_masked: Mapped[str | None] = mapped_column(String(20), nullable=True)

    other_gov_id: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True)
    id_type: Mapped[IdType] = mapped_column(Enum(IdType), nullable=False, default=IdType.aadhaar)

    phone: Mapped[str] = mapped_column(String(15), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    dob: Mapped[date] = mapped_column(Date, nullable=False)

    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.citizen)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="user", foreign_keys="Application.user_id",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    decided_applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="admin", foreign_keys="Application.admin_id",
    )
    admin_logs: Mapped[list["AdminLog"]] = relationship("AdminLog", back_populates="admin")

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_phone", "phone"),
        Index("ix_users_aadhaar_hash", "aadhaar_hash"),
        Index("ix_users_role", "role"),
    )
