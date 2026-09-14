"""Auth request/response schemas."""

from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.aadhaar import (
    is_valid_aadhaar,
    normalize_aadhaar,
    normalize_gov_id,
    validate_other_gov_id,
)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    id_type: str = Field(description="aadhaar | voter | pan | dl")
    aadhaar_number: str | None = Field(default=None, description="12-digit Aadhaar (if id_type=aadhaar)")
    other_gov_id: str | None = Field(default=None, description="Voter/PAN/DL number otherwise")
    phone: str = Field(min_length=10, max_length=15)
    email: EmailStr
    address: str = Field(min_length=5, max_length=500)
    dob: date
    password: str = Field(min_length=8, max_length=72)

    @field_validator("id_type")
    @classmethod
    def check_id_type(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in {"aadhaar", "voter", "pan", "dl"}:
            raise ValueError("id_type must be one of: aadhaar, voter, pan, dl")
        return v

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 10 or len(digits) > 13:
            raise ValueError("Enter a valid phone number")
        return digits[-10:]

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain both letters and numbers")
        return v

    def model_post_init(self, __context) -> None:  # validate cross-fields after parsing
        if self.id_type == "aadhaar":
            if not self.aadhaar_number or not is_valid_aadhaar(self.aadhaar_number):
                raise ValueError("Enter a valid 12-digit Aadhaar number")
        else:
            if not self.other_gov_id or not validate_other_gov_id(self.id_type, self.other_gov_id):
                raise ValueError(f"Enter a valid {self.id_type.upper()} number")


class LoginRequest(BaseModel):
    """Citizens log in with their gov ID (Aadhaar digits or Voter/PAN/DL) + password."""

    identifier: str = Field(min_length=3, max_length=40, description="Aadhaar number or other gov ID")
    password: str = Field(min_length=1, max_length=72)

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, v: str) -> str:
        v = v.strip()
        # Aadhaar with spaces/dashes -> digits; other IDs -> uppercase.
        maybe_digits = normalize_aadhaar(v)
        if maybe_digits.isdigit():
            return maybe_digits
        return normalize_gov_id(v)


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
