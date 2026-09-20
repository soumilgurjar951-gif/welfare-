"""User schemas. Aadhaar is ALWAYS exposed masked — never raw."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    id_type: str
    aadhaar_masked: str | None = None
    other_gov_id: str | None = None
    phone: str
    email: EmailStr
    address: str
    dob: date
    role: str
    mfa_enabled: bool = False
    created_at: datetime


class ProfileUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
