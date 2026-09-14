"""Scheme queries."""

from sqlalchemy.orm import Session

from app.models.scheme import Scheme


def list_active_schemes(db: Session) -> list[Scheme]:
    return db.query(Scheme).filter(Scheme.is_active.is_(True)).order_by(Scheme.name).all()


def list_all_schemes(db: Session) -> list[Scheme]:
    return db.query(Scheme).order_by(Scheme.name).all()


def get_scheme(db: Session, scheme_id: int) -> Scheme | None:
    return db.get(Scheme, scheme_id)
