"""Uploaded supporting document for an application."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    file_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/octet-stream")
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    application: Mapped["Application"] = relationship("Application", back_populates="documents")

    __table_args__ = (Index("ix_documents_application", "application_id"),)
