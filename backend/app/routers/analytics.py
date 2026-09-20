"""Dashboards + geography analytics (PRD §5 Analytics, §15, §17)."""

from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_officer_reader, get_db
from app.models.gap_case import GapCase, GapStatus
from app.models.user import User
from app.schemas.gap_case import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary, summary="Gap distribution + resolution rate")
def summary(db: Session = Depends(get_db),
            officer: User = Depends(get_current_officer_reader)):
    rows = db.query(GapCase).options(joinedload(GapCase.scheme)).all()
    by_label = Counter(g.label.value for g in rows)
    by_scheme = Counter(g.scheme.name if g.scheme else f"#{g.scheme_id}" for g in rows)
    by_district = Counter(g.district for g in rows)
    open_n = sum(1 for g in rows if g.status == GapStatus.open)
    verified = sum(1 for g in rows if g.status == GapStatus.verified)
    fp = sum(1 for g in rows if g.status == GapStatus.false_positive)
    nmd = sum(1 for g in rows if g.status == GapStatus.needs_more_data)
    high = sum(1 for g in rows if g.priority >= 70)
    decided = sum(1 for g in rows if g.status in
                  (GapStatus.verified, GapStatus.false_positive, GapStatus.closed))
    rate = round(decided / len(rows), 3) if rows else 0.0
    return AnalyticsSummary(
        total_gaps=len(rows), open=open_n, verified=verified,
        false_positive=fp, needs_more_data=nmd, high_priority=high,
        by_label=dict(by_label), by_scheme=dict(by_scheme), by_district=dict(by_district),
        resolution_rate=rate, ai_candidates=open_n, officer_verified_outcomes=decided,
    )


@router.get("/geography", summary="Village gap heatmap buckets (PRD §15)")
def geography(db: Session = Depends(get_db),
              officer: User = Depends(get_current_officer_reader)):
    rows = db.query(GapCase).all()
    buckets: dict[str, dict] = {}
    for g in rows:
        key = f"{g.district} / {g.block} / {g.village}".strip(" /")
        b = buckets.setdefault(key, {"village": key, "gaps": 0, "max_priority": 0})
        b["gaps"] += 1
        b["max_priority"] = max(b["max_priority"], g.priority)
    for b in buckets.values():
        b["level"] = "high" if b["max_priority"] >= 70 else ("medium" if b["max_priority"] >= 40 else "low")
    return {"villages": sorted(buckets.values(), key=lambda x: x["gaps"], reverse=True)}
