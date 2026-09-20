"""Grievance redressal DTOs (citizen + officer views)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

CATEGORIES = ["delay", "rejection_appeal", "payment", "documents", "service", "other"]


class GrievanceCreate(BaseModel):
    category: str = Field(default="other", max_length=60)
    subject: str = Field(min_length=5, max_length=200)
    description: str = Field(default="", max_length=4000)
    application_id: int | None = None


class GrievanceRespond(BaseModel):
    response: str = Field(min_length=5, max_length=4000)
    resolve: bool = False  # True -> mark Resolved in the same step


class GrievanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    citizen_id: int
    citizen_name: str | None = None
    citizen_phone: str | None = None
    category: str
    subject: str
    description: str
    application_id: int | None = None
    status: str
    officer_response: str | None = None
    responded_by: str | None = None
    sla_due: datetime
    escalated_at: datetime | None = None
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime
