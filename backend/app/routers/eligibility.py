"""Public eligibility finder (no auth — pre-registration self-service)."""

from fastapi import APIRouter

from app.schemas.eligibility import EligibilityProfile, EligibilityResult
from app.services.eligibility import match_schemes

router = APIRouter(prefix="/eligibility", tags=["public-eligibility"])


@router.post("/check", response_model=EligibilityResult, summary="Rank schemes by match score")
def check_eligibility(profile: EligibilityProfile):
    matches = match_schemes(profile.model_dump())
    return EligibilityResult(matches=matches)  # type: ignore[arg-type]
