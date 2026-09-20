"""One-click demo + guided 9-step walkthrough (PRD §4, §17 Demo Readiness).

Message: AI Found the Gap → Officer Verified → Action Ready.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_current_officer_reader, get_db
from app.models.gap_case import GapCase
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.gap_case import DemoRunResult, DemoStep
from app.services.audit import log_event
from app.services.demo_seed import ensure_demo_data, run_gap_scan

router = APIRouter(prefix="/demo", tags=["demo"])

STEPS: list[tuple[str, str]] = [
    ("Import Demo Data", "Departmental CSV/XLSX/API load — land, citizens, bank, scheme records (MP demo)."),
    ("Clean & Normalize", "Names, addresses, identifiers, geography normalized (token demo)."),
    ("Match Records", "Deterministic + probabilistic matching with score + evidence."),
    ("Check Eligibility", "Versioned rules — land threshold, exclusion criteria, bank conditions."),
    ("Detect Welfare Gap", "Eligible but no benefit for 18 months."),
    ("Detect Anomaly / Root Cause", "Invalid IFSC / payment bounce patterns."),
    ("Calculate Priority", "0–100 from urgency, deprivation, risk, delay, impact."),
    ("Officer Verification", "Mandatory human-in-the-loop: verify / false-positive / request-info."),
    ("Generate Action Report", "Administrative memorandum with decision reason + tracking code."),
]


@router.get("/walkthrough", response_model=list[DemoStep], summary="Guided 9-step walkthrough")
def walkthrough(db: Session = Depends(get_db),
                officer: User = Depends(get_current_officer_reader)):
    total = db.query(GapCase).count()
    schemes = db.query(Scheme).count()
    live = {1: schemes, 5: total, 7: total, 8: total, 9: total}
    return [DemoStep(step=i + 1, activity=a, requirement=r, live_count=live.get(i + 1))
            for i, (a, r) in enumerate(STEPS)]


@router.post("/run", response_model=DemoRunResult, summary="Run Complete Demo (one click)")
def run_demo(db: Session = Depends(get_db), officer: User = Depends(get_current_admin)):
    seeded = ensure_demo_data(db)
    created = run_gap_scan(db)
    total = db.query(GapCase).count()
    log_event(db, actor=officer, action="demo.run", entity_type="demo",
              entity_id="complete", details={"created": created, "seeded": seeded})
    steps = [DemoStep(step=i + 1, activity=a, requirement=r) for i, (a, r) in enumerate(STEPS)]
    return DemoRunResult(steps=steps, created=created, total_gaps=total,
                         message=f"Demo complete: {seeded} citizens ensured, {created} new gap cases, {total} total.")
