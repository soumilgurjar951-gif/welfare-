"""Idempotent seed: 5 schemes + 1 default admin user."""

from datetime import date

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.scheme import Scheme
from app.models.user import IdType, User, UserRole

SCHEMES = [
    {
        "name": "PM Awas Yojana",
        "description": "Housing assistance for economically weaker households to build or upgrade a home.",
        "eligibility": "EWS/LIG families without a pucca house; Aadhaar + income proof required.",
        "required_documents": "Aadhaar Card, Income Certificate, Property/Land Records (7/12), Bank Account Passbook",
    },
    {
        "name": "National Pension Scheme",
        "description": "Monthly pension support for senior citizens and unorganised workers.",
        "eligibility": "Age 60+ (or 18-40 for contributory tier); bank account + ID proof required.",
        "required_documents": "Age Proof (Birth Cert / Voter ID), Family Income Certificate, Active Bank Passbook",
    },
    {
        "name": "Merit Scholarship",
        "description": "Scholarship for students from low-income families pursuing higher education.",
        "eligibility": "Enrolled student, family income below threshold, 60%+ in last exam.",
        "required_documents": "Previous Exam Marksheet, Family Income Certificate, Caste/Category Certificate, College Fee Receipt",
    },
    {
        "name": "Ration Subsidy (PDS)",
        "description": "Subsidised food grains via fair-price shops for eligible ration card holders.",
        "eligibility": "Valid ration card / priority household; Aadhaar-seeded bank account.",
        "required_documents": "Existing Ration Card Copy, Family Passport Photo, Domicile/Address Proof",
    },
    {
        "name": "Direct Benefit Transfer (DBT)",
        "description": "Direct cash transfer of subsidies and benefits to Aadhaar-linked bank accounts.",
        "eligibility": "Aadhaar-linked bank account + scheme-specific eligibility proof.",
        "required_documents": "Aadhaar Linked Bank Passbook, Scheme Eligibility Proof, Identity Proof",
    },
]


def seed() -> None:
    # Auto-migrate SQLite schema for required_documents column
    try:
        import sqlite3
        conn = sqlite3.connect("scheme_sync.db")
        cursor = conn.cursor()
        try:
            cursor.execute("ALTER TABLE schemes ADD COLUMN required_documents TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        conn.close()
    except Exception as e:
        print(f"Migration notice: {e}")

    db = SessionLocal()

    try:
        for s in SCHEMES:
            existing = db.query(Scheme).filter(Scheme.name == s["name"]).first()
            if not existing:
                db.add(Scheme(name=s["name"], description=s["description"],
                              eligibility=s["eligibility"],
                              required_documents=s["required_documents"],
                              is_active=True))
            else:
                existing.required_documents = s["required_documents"]
        admin_email = settings.SEED_ADMIN_EMAIL.strip().lower()
        if not db.query(User).filter(User.email == admin_email).first():
            db.add(
                User(
                    name="Scheme Officer",
                    id_type=IdType.aadhaar,
                    aadhaar_hash=None,
                    aadhaar_masked=None,
                    other_gov_id="ADMIN001",
                    phone=settings.SEED_ADMIN_PHONE,
                    email=admin_email,
                    address="District Collectorate, Admin Block",
                    dob=date(1990, 1, 1),
                    role=UserRole.admin,
                    hashed_password=get_password_hash(settings.SEED_ADMIN_PASSWORD),
                )
            )

        # ── Demo citizen user ──────────────────────────────────────────────────
        citizen_email = "rahul.sharma@example.com"
        citizen_phone = "9876543210"
        if not db.query(User).filter(User.email == citizen_email).first():
            from app.utils.aadhaar import hash_aadhaar, mask_aadhaar
            raw_aadhaar = "234567890123"
            db.add(
                User(
                    name="Rahul Sharma",
                    id_type=IdType.aadhaar,
                    aadhaar_hash=hash_aadhaar(raw_aadhaar),
                    aadhaar_masked=mask_aadhaar(raw_aadhaar),
                    other_gov_id=None,
                    phone=citizen_phone,
                    email=citizen_email,
                    address="12, Gandhi Nagar, Pune, Maharashtra - 411001",
                    dob=date(1995, 6, 15),
                    role=UserRole.citizen,
                    hashed_password=get_password_hash("Citizen@123"),
                )
            )

        db.commit()
        print("Seed complete: 5 schemes + admin + demo citizen ensured.")
        print(f"Admin   -> email: {admin_email} | password: {settings.SEED_ADMIN_PASSWORD}")
        print(f"Citizen -> email/phone: {citizen_email} / {citizen_phone} | password: Citizen@123")
    finally:
        db.close()



if __name__ == "__main__":
    # Create tables directly if Alembic hasn't run (dev convenience; use Alembic in prod).
    from app.db.base import Base  # noqa: E402
    from app.db.session import engine  # noqa: E402

    Base.metadata.create_all(bind=engine)
    seed()
