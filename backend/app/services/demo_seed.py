"""MP-focused demo dataset + gap scan (PRD §4, §18 MVP, §26 demo message).

Idempotent: safe to re-run. Citizens carry no real Aadhaar — masked demo IDs only.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.gap_case import GapCase, GapStatus
from app.models.scheme import Scheme
from app.models.user import IdType, User, UserRole
from app.services.gap_engine import evaluate_case, sla_due
from app.utils.aadhaar import hash_aadhaar, mask_aadhaar

# district, block, village, citizen, land_acres, income, ration, months, ifsc, bounce, missing
DEMO_ROWS: list[tuple] = [
    ("Bhopal", "Phanda", "Kolar", "Meera Yadav", 1.2, 85000, True, 26, "SBIN0060234", False, False),
    ("Bhopal", "Phanda", "Kolar", "Ramesh Patel", 4.5, 150000, True, 20, "SBIN00602X4", False, False),
    ("Indore", "Depalpur", "Betma", "Sunita Chouhan", 0.8, 70000, True, 34, "HDFC0001234", False, False),
    ("Indore", "Depalpur", "Betma", "Arjun Verma", 6.0, 320000, False, 6, "HDFC0001234", False, False),
    ("Gwalior", "Morar", "Sirol", "Kavita Sharma", 2.0, 95000, True, 22, "ICIC0005678", True, False),
    ("Gwalior", "Morar", "Sirol", "Vikram Singh", 1.5, 120000, False, 19, None, False, True),
    ("Bhopal", "Berasia", "Berasia", "Pooja Malviya", 3.0, 110000, True, 18, "SBIN0060234", False, False),
    ("Ujjain", "Ghattia", "Panwasa", "Mohan Rathore", 1.0, 90000, True, 40, "BARB0UJjain".upper(), False, False),
]


def ensure_demo_data(db: Session) -> int:
    created = 0
    for i, row in enumerate(DEMO_ROWS):
        district, block, village, name = row[0], row[1], row[2], row[3]
        email = f"demo.{district.lower()}.{i}@example.com"
        if db.query(User).filter(User.email == email).first():
            continue
        raw = f"{900000000000 + i}"
        db.add(User(
            name=name, id_type=IdType.aadhaar,
            aadhaar_hash=hash_aadhaar(raw), aadhaar_masked=mask_aadhaar(raw),
            other_gov_id=None, phone=f"91100000{i:02d}", email=email,
            address=f"{village}, {block}, {district}, Madhya Pradesh",
            dob=date(1985, 1, 1), role=UserRole.citizen,
            hashed_password=get_password_hash("Demo@123"),
        ))
        created += 1
    db.commit()
    return created


def run_gap_scan(db: Session) -> int:
    schemes = db.query(Scheme).filter(Scheme.is_active == True).all()  # noqa: E712
    if not schemes:
        return 0
    users = db.query(User).filter(User.role == UserRole.citizen).all()
    demo_by_name = {r[3]: r for r in DEMO_ROWS}
    created = 0
    for u in users:
        row = demo_by_name.get(u.name)
        if row is None:
            continue
        district, block, village = row[0], row[1], row[2]
        kwargs = dict(land_acres=row[4], income_yearly=row[5], has_ration_card=row[6],
                      months_since_benefit=row[7], ifsc=row[8],
                      payment_bounced=row[9], data_missing=row[10])
        for s in schemes[:3]:  # scan first 3 active schemes per citizen
            exists = db.query(GapCase).filter(
                GapCase.user_id == u.id, GapCase.scheme_id == s.id).first()
            if exists:
                continue
            out = evaluate_case(citizen_name=u.name, scheme_name=s.name, **kwargs)
            db.add(GapCase(
                user_id=u.id, scheme_id=s.id, citizen_name=u.name,
                aadhaar_masked=u.aadhaar_masked, district=district, block=block, village=village,
                label=out["label"], confidence=out["confidence"], priority=out["priority"],
                explanation=out["explanation"], evidence=out["evidence"],
                eligibility_signals=out["eligibility_signals"], rule_version=out["rule_version"],
                model_version=out["model_version"], anomaly=out["anomaly"],
                root_cause=out["root_cause"], top_factors=out["top_factors"],
                data_freshness=out["data_freshness"], provenance=out["provenance"],
                limitations=out["limitations"], status=GapStatus.open, sla_due=sla_due(),
                verification_history=[],
            ))
            created += 1
    db.commit()
    return created
