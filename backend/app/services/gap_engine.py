"""Rule-based welfare-gap engine (PRD §8) with XGBoost-optional ranking.

Deterministic + transparent: every output carries rule/model version,
confidence, top factors, freshness and limitations. AI never auto-decides
(PRD hard rule) — officers verify via /gap-cases endpoints.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from app.models.gap_case import GapLabel

RULE_VERSION = "rules-v1.0-mvp"

try:  # XGBoost is optional; rule fallback is the governed default for the demo.
    import xgboost  # noqa: F401

    MODEL_VERSION = "xgb-available:rule-v1"
except Exception:
    MODEL_VERSION = "rule-fallback-v1"

LIMITATIONS = (
    "Rule-based demo output, not a confirmed entitlement. "
    "Verify against authorized Bhulekh/Samagra/PFMS/PM-KISAN records before action."
)


def _norm(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def clean_name(name: str) -> str:
    """Token normalization for matching (PRD step 2: Soundex/token demo)."""
    return _norm(name)


def match_score(name_a: str, name_b: str) -> int:
    """Deterministic token-overlap score 0-100 (entity-resolution demo)."""
    a, b = set(clean_name(name_a).split()), set(clean_name(name_b).split())
    if not a or not b:
        return 0
    return round(100 * len(a & b) / max(len(a), len(b)))


def _valid_ifsc(ifsc: str | None) -> bool:
    return bool(re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", (ifsc or "").upper()))


def evaluate_case(
    *,
    citizen_name: str,
    scheme_name: str,
    land_acres: float = 0.0,
    income_yearly: float = 0.0,
    has_ration_card: bool = False,
    months_since_benefit: int = 99,
    ifsc: str | None = None,
    payment_bounced: bool = False,
    name_variant: str | None = None,
    data_missing: bool = False,
) -> dict:
    """Run PRD steps 2-7 for one citizen×scheme pair."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    signals: dict[str, object] = {
        "land_acres": land_acres,
        "income_yearly": income_yearly,
        "has_ration_card": has_ration_card,
        "months_since_benefit": months_since_benefit,
    }

    # Step 4 — versioned rule signals (demo thresholds)
    eligible = land_acres <= 5.0 and income_yearly <= 200_000
    signals["eligible_by_rules"] = eligible
    factors: list[str] = []
    if land_acres <= 2.0:
        factors.append("marginal landholding (≤2 acres)")
    if income_yearly <= 100_000:
        factors.append("low household income (≤₹1L/yr)")
    if months_since_benefit >= 18:
        factors.append(f"no benefit for {months_since_benefit} months (≥18)")

    # Step 3 — identity match evidence
    evidence: list[dict[str, object]] = [
        {"source": "Samagra", "record": citizen_name, "match_score": 95},
        {"source": "Bhulekh/Land Records", "record": f"{land_acres} acres", "match_score": 90},
        {"source": "PFMS/Bank", "record": "account seeded" if _valid_ifsc(ifsc) else "account unverified",
         "match_score": 80 if _valid_ifsc(ifsc) else 40},
        {"source": "PM-KISAN", "record": scheme_name, "match_score": 85},
    ]
    if name_variant:
        evidence.append({"source": "Cross-dept name variant",
                         "record": name_variant, "match_score": match_score(citizen_name, name_variant)})

    # Step 6 — anomaly / root cause
    anomaly: dict[str, object] | None = None
    root_cause: str | None = None
    if ifsc and not _valid_ifsc(ifsc):
        anomaly = {"type": "invalid_ifsc", "ifsc": ifsc}
        root_cause = "Invalid IFSC (bank merger/change?) — payment likely to bounce."
        factors.append("invalid IFSC")
    elif payment_bounced:
        anomaly = {"type": "payment_bounce", "detail": "PFMS payment bounced"}
        root_cause = "Payment bounce — verify bank account/IFSC with PFMS."
        factors.append("payment bounce")

    # Step 5 — gap detection
    gap = eligible and months_since_benefit >= 18

    # Step 9 labels
    if data_missing:
        label = GapLabel.insufficient_data
        confidence = 35
    elif anomaly and "invalid_ifsc" in str(anomaly):
        label = GapLabel.conflict_detected
        confidence = 70
    elif not eligible:
        label = GapLabel.not_supported
        confidence = 80
    elif gap:
        label = GapLabel.potentially_eligible
        confidence = 82 if not anomaly else 68
    else:
        label = GapLabel.verification_required
        confidence = 60

    # Step 7 — priority 0-100: urgency + deprivation + risk + delay + impact
    urgency = min(30, months_since_benefit)  # delay weight
    deprivation = 25 if income_yearly <= 100_000 else (15 if income_yearly <= 200_000 else 5)
    risk = 20 if anomaly else 5
    impact = 15 if eligible else 0
    vulnerability = 10 if land_acres <= 2.0 else 5
    priority = max(0, min(100, urgency + deprivation + risk + impact + vulnerability))

    explanation = (
        f"{label.value}: {citizen_name} vs '{scheme_name}' — "
        f"eligible={eligible}, gap={gap}, priority={priority}, confidence={confidence}%. "
        + ("Root cause: " + root_cause if root_cause else "No anomaly detected.")
    )

    return {
        "label": label,
        "confidence": confidence,
        "priority": priority,
        "explanation": explanation,
        "evidence": evidence,
        "eligibility_signals": signals,
        "rule_version": RULE_VERSION,
        "model_version": MODEL_VERSION,
        "anomaly": anomaly,
        "root_cause": root_cause,
        "top_factors": factors or ["routine review"],
        "data_freshness": now,
        "provenance": {"sources": ["Samagra", "Bhulekh", "PFMS/Bank", "PM-KISAN"], "demo": True},
        "limitations": LIMITATIONS,
    }


def sla_due(days: int = 14) -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=days)
