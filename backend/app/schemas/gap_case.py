"""Gap-case + analytics + demo + report schemas (PRD §5-6, §17)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GapCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scheme_id: int
    scheme_name: str | None = None
    citizen_name: str
    aadhaar_masked: str | None = None
    district: str
    block: str
    village: str
    label: str
    confidence: int
    priority: int
    explanation: str
    evidence: list | dict | None = None
    eligibility_signals: dict | None = None
    rule_version: str
    model_version: str
    anomaly: dict | None = None
    root_cause: str | None = None
    top_factors: list | None = None
    data_freshness: datetime | None = None
    provenance: dict | None = None
    limitations: str | None = None
    status: str
    assignment: str | None = None
    sla_due: datetime | None = None
    decision_reason: str | None = None
    decided_by: str | None = None
    decided_at: datetime | None = None
    verification_history: list | None = None
    tracking_code: str | None = None
    created_at: datetime


class GapVerifyRequest(BaseModel):
    decision_reason: str = Field(min_length=5, max_length=2000)
    assignment: str | None = Field(default=None, max_length=255)


class GapFlagRequest(BaseModel):
    decision_reason: str = Field(min_length=5, max_length=2000)


class GapRequestInfoRequest(BaseModel):
    decision_reason: str = Field(min_length=5, max_length=2000)  # what info is needed
    assignment: str | None = Field(default=None, max_length=255)


class AnalyticsSummary(BaseModel):
    total_gaps: int
    open: int
    verified: int
    false_positive: int
    needs_more_data: int
    high_priority: int  # priority >= 70
    by_label: dict[str, int]
    by_scheme: dict[str, int]
    by_district: dict[str, int]
    resolution_rate: float
    ai_candidates: int  # status Open
    officer_verified_outcomes: int  # Verified + FalsePositive + Closed


class DemoStep(BaseModel):
    step: int
    activity: str
    requirement: str
    live_count: int | None = None


class DemoRunResult(BaseModel):
    steps: list[DemoStep]
    created: int
    total_gaps: int
    message: str


class ActionMemo(BaseModel):
    tracking_code: str
    verify_url: str | None = None
    subject: str
    body: str
    decided_by: str | None = None
    decided_at: datetime | None = None
    watermark: str
