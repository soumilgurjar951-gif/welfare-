"""User queries."""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_aadhaar_hash(db: Session, aadhaar_hash: str) -> User | None:
    return db.query(User).filter(User.aadhaar_hash == aadhaar_hash).first()


def get_user_by_gov_id(db: Session, gov_id: str) -> User | None:
    return db.query(User).filter(User.other_gov_id == gov_id.strip().upper()).first()


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
    """Identifier is either 12-digit Aadhaar or an upper-cased gov ID / email / phone."""
    from app.utils.aadhaar import hash_aadhaar

    ident = (identifier or "").strip()
    if ident.isdigit() and len(ident) == 12:
        user = get_user_by_aadhaar_hash(db, hash_aadhaar(ident))
        if user:
            return user
    gov = get_user_by_gov_id(db, ident.upper())
    if gov:
        return gov
    # Fall back to email / phone so citizens can also log in that way.
    user = get_user_by_email(db, ident.lower())
    if user:
        return user
    return db.query(User).filter(User.phone == ident[-10:]).first()


def identifier_taken(db: Session, *, email: str, phone: str,
                     aadhaar_hash: str | None, gov_id: str | None) -> str | None:
    """Return a human-readable conflict message if any unique field is taken."""
    if db.query(User).filter(User.email == email.strip().lower()).first():
        return "Email is already registered"
    if db.query(User).filter(User.phone == phone).first():
        return "Phone number is already registered"
    if aadhaar_hash and db.query(User).filter(User.aadhaar_hash == aadhaar_hash).first():
        return "This Aadhaar number is already registered"
    if gov_id and db.query(User).filter(User.other_gov_id == gov_id).first():
        return "This government ID is already registered"
    return None
