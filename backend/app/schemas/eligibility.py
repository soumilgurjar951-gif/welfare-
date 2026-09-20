"""Eligibility Finder DTOs (public, no auth — pre-registration self-service)."""

from pydantic import BaseModel, Field


class EligibilityProfile(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    annual_income: float | None = Field(default=None, ge=0)
    land_acres: float | None = Field(default=None, ge=0)
    occupation: str | None = Field(default=None, max_length=60)
    category: str | None = Field(default="general", max_length=20)
    is_student: bool = False
    last_marks_pct: float | None = Field(default=None, ge=0, le=100)
    own_pucca_house: bool | None = None
    has_ration_card: bool | None = None
    aadhaar_bank_linked: bool | None = None


class MissingCriterion(BaseModel):
    criterion: str
    what_to_do: str


class SchemeMatch(BaseModel):
    scheme: str
    score: int
    verdict: str
    matched: list[str]
    missing: list[MissingCriterion]


class EligibilityResult(BaseModel):
    matches: list[SchemeMatch]
    note: str = ("Rule-based guidance, not a final entitlement decision. "
                 "Officer verification of documents is required.")
