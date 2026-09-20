"""Public transparency stats — no auth, anonymized aggregates only."""

import platform
import sys

import fastapi
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db
from app.crud.scheme import list_active_schemes
from app.models.application import Application, ApplicationStatus

router = APIRouter(prefix="/stats", tags=["public-stats"])


@router.get("/public", summary="Public anonymized aggregates for landing page")
def public_stats(db: Session = Depends(get_db)) -> dict:
    total = db.query(Application).count()
    approved = db.query(Application).filter(Application.status == ApplicationStatus.approved).count()
    disbursed = db.query(func.coalesce(func.sum(Application.benefit_amount), 0)).filter(
        Application.status == ApplicationStatus.approved
    ).scalar() or 0
    schemes = len(list_active_schemes(db))
    return {
        "total_applications": total,
        "approved": approved,
        "total_disbursed": float(disbursed),
        "active_schemes": schemes,
    }


@router.get("/version", summary="Runtime versions for patch-compliance evidence")
def version() -> dict:
    return {
        "service": settings.PROJECT_NAME,
        "api_version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "python": platform.python_version(),
        "fastapi": fastapi.__version__,
        "interpreter": sys.version.split()[0],
        "database": "sqlite" if settings.is_sqlite else "mysql",
    }
