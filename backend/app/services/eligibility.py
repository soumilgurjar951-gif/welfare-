"""Rule-based scheme eligibility matcher (citizen self-service).

Each scheme declares weighted criteria against a citizen profile.
Score = matched weight / total weight * 100. Missing criteria are
returned as actionable hints ("what to fix / check").
"""

from dataclasses import dataclass


@dataclass
class Criterion:
    label: str
    weight: int
    passed: bool
    hint: str  # shown when NOT passed


@dataclass
class SchemeRule:
    scheme: str
    criteria: list[Criterion]


def _p(d: dict, key: str, default=None):
    return d.get(key, default)


def match_schemes(profile: dict) -> list[dict]:
    age = _p(profile, "age")
    income = _p(profile, "annual_income")
    land = _p(profile, "land_acres")
    occupation = str(_p(profile, "occupation") or "").lower()
    category = str(_p(profile, "category") or "general").lower()
    is_student = bool(_p(profile, "is_student", False))
    marks = _p(profile, "last_marks_pct")
    own_house = _p(profile, "own_pucca_house")
    ration = _p(profile, "has_ration_card")
    bank = _p(profile, "aadhaar_bank_linked")

    def num(v):
        return isinstance(v, (int, float)) and v >= 0

    rules = [
        SchemeRule("PM Awas Yojana", [
            Criterion("No pucca house of your own", 35, own_house is False,
                      "Scheme is for families without a pucca house"),
            Criterion("Family income within EWS/LIG band (≤ ₹3,00,000/yr)", 30,
                      num(income) and income <= 300_000,
                      "Provide income certificate within the EWS/LIG band"),
            Criterion("Adult applicant (18+)", 15, num(age) and age >= 18,
                      "Applicant must be 18 or older"),
            Criterion("Aadhaar-linked bank account", 20, bank is True,
                      "Link Aadhaar to your bank account for DBT"),
        ]),
        SchemeRule("National Pension Scheme", [
            Criterion("Age 60+ (pension tier) or 18–40 (contributory tier)", 50,
                      (num(age) and age >= 60) or (num(age) and 18 <= age <= 40),
                      "Pension tier needs age 60+; contributory tier needs 18–40"),
            Criterion("Bank account + ID proof available", 25, bank is True,
                      "Keep an active bank account with ID proof"),
            Criterion("Unorganised worker / senior citizen", 25,
                      occupation in ("unorganised", "labour", "farmer", "senior", "retired", "none", ""),
                      "Meant for unorganised workers and senior citizens"),
        ]),
        SchemeRule("Merit Scholarship", [
            Criterion("Currently enrolled student", 40, is_student,
                      "Must be an enrolled student"),
            Criterion("Family income below ₹2,50,000/yr", 30,
                      num(income) and income <= 250_000,
                      "Attach family income certificate below the threshold"),
            Criterion("60%+ marks in last exam", 30,
                      num(marks) and marks >= 60,
                      "Needs 60%+ in the last qualifying exam"),
        ]),
        SchemeRule("Ration Subsidy (PDS)", [
            Criterion("Valid ration / priority-household card", 45, ration is True,
                      "Apply for a ration card first (one-time process)"),
            Criterion("Family income within priority band (≤ ₹2,00,000/yr)", 30,
                      num(income) and income <= 200_000,
                      "Priority-household band needs income proof"),
            Criterion("Domicile / address proof", 25, True,
                      "Keep any address proof handy (always satisfiable)"),
        ]),
        SchemeRule("Direct Benefit Transfer (DBT)", [
            Criterion("Aadhaar-linked bank account", 55, bank is True,
                      "Seed Aadhaar with your bank account (bank + e-KYC)"),
            Criterion("Eligible under at least one linked scheme", 30,
                      True, "DBT rides on top of a scheme you qualify for"),
            Criterion("Small/marginal profile (land ≤ 5 acres or income ≤ ₹2,00,000)", 15,
                      (num(land) and land <= 5) or (num(income) and income <= 200_000),
                      "Most DBT benefits target small holders / low income"),
        ]),
    ]

    out = []
    for r in rules:
        total = sum(c.weight for c in r.criteria) or 1
        got = sum(c.weight for c in r.criteria if c.passed)
        score = round(got / total * 100)
        out.append({
            "scheme": r.scheme,
            "score": score,
            "verdict": "Highly likely" if score >= 75 else ("Possible" if score >= 45 else "Unlikely"),
            "matched": [c.label for c in r.criteria if c.passed],
            "missing": [{"criterion": c.label, "what_to_do": c.hint}
                        for c in r.criteria if not c.passed],
        })
    out.sort(key=lambda x: x["score"], reverse=True)
    return out
