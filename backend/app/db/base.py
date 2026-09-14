"""SQLAlchemy declarative base + model registry for Alembic."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models here so Alembic autogenerate sees every table.
from app.models import admin_log, application, document, scheme, user  # noqa: E402,F401
