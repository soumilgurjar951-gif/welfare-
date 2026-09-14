"""Application queries: citizen history + richly filtered admin listing."""

from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.application import Application, ApplicationStatus
from app.models.scheme import Scheme
from app.models.user import User


def get_application(db: Session, app_id: int) -> Application | None:
    return (
        db.query(Application)
        .options(joinedload(Application.user), joinedload(Application.scheme),
                 joinedload(Application.documents))
        .filter(Application.id == app_id)
        .first()
    )


def list_user_applications(db: Session, user_id: int) -> list[Application]:
    return (
        db.query(Application)
        .options(joinedload(Application.scheme), joinedload(Application.documents))
        .filter(Application.user_id == user_id)
        .order_by(Application.created_at.desc())
        .all()
    )


def has_pending_for_scheme(db: Session, user_id: int, scheme_id: int) -> bool:
    return (
        db.query(Application)
        .filter(
            Application.user_id == user_id,
            Application.scheme_id == scheme_id,
            Application.status == ApplicationStatus.pending,
        )
        .first()
        is not None
    )


def count_by_status(db: Session) -> dict[str, int | float]:
    from sqlalchemy import func
    total = db.query(Application).count()
    pending = db.query(Application).filter(Application.status == ApplicationStatus.pending).count()
    approved = db.query(Application).filter(Application.status == ApplicationStatus.approved).count()
    rejected = db.query(Application).filter(Application.status == ApplicationStatus.rejected).count()
    total_disbursed = db.query(func.coalesce(func.sum(Application.benefit_amount), 0)).filter(
        Application.status == ApplicationStatus.approved
    ).scalar() or 0
    # Convert Decimal to float for JSON
    try:
        total_disbursed = float(total_disbursed)
    except Exception:
        total_disbursed = 0
    return {"total": total, "pending": pending, "approved": approved, "rejected": rejected, "total_disbursed": total_disbursed}


def admin_list_applications(
    db: Session,
    *,
    status: str | None = None,
    scheme_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Application], int]:
    q = (
        db.query(Application)
        .join(User, Application.user_id == User.id)
        .join(Scheme, Application.scheme_id == Scheme.id)
        .options(joinedload(Application.user), joinedload(Application.scheme))
    )
    if status:
        try:
            q = q.filter(Application.status == ApplicationStatus(status))
        except ValueError:
            pass
    if scheme_id:
        q = q.filter(Application.scheme_id == scheme_id)
    if date_from:
        q = q.filter(Application.created_at >= date_from)
    if date_to:
        q = q.filter(Application.created_at <= date_to)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                User.name.ilike(like),
                User.email.ilike(like),
                User.phone.ilike(like),
                User.aadhaar_masked.ilike(like),
                User.other_gov_id.ilike(like),
                Scheme.name.ilike(like),
            )
        )
    total = q.count()
    rows = q.order_by(Application.created_at.desc()).offset(offset).limit(min(limit, 200)).all()
    return rows, total
