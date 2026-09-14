"""Application + document + admin-action schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserOut


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_type: str
    file_size: int
    file_path: str
    uploaded_at: datetime


class ApplicationCreate(BaseModel):
    scheme_id: int
    reason: str = Field(min_length=10, max_length=2000)


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    scheme_id: int
    reason: str
    status: str
    rejection_reason: str | None = None
    benefit_amount: Decimal | None = None
    remarks: str | None = None
    admin_id: int | None = None
    decided_at: datetime | None = None
    created_at: datetime
    scheme_name: str | None = None
    documents: list[DocumentOut] = []


class ApplicationDetailOut(ApplicationOut):
    """Admin view: full citizen record embedded (Aadhaar already masked)."""

    user: UserOut | None = None
    admin_name: str | None = None


class ApproveRequest(BaseModel):
    benefit_amount: Decimal | None = Field(default=None, ge=0, le=10_000_000)
    remarks: str | None = Field(default=None, max_length=2000)


class RejectRequest(BaseModel):
    rejection_reason: str = Field(min_length=5, max_length=2000)
    remarks: str | None = Field(default=None, max_length=2000)


class AdminLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_id: int
    application_id: int
    action: str
    remarks: str | None = None
    created_at: datetime
    admin_name: str | None = None


class DashboardStats(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    total_disbursed: float = 0
