"""Auth dependencies: current user + role-gated admin dependency."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.crud.user import get_user_by_id
from app.db.session import get_db_session
from app.models.user import READ_ROLES, User, UserRole

OFFICER_ROLES: set[str] = {"admin", "welfare_officer", "collector", "sys_admin"}

bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    yield from get_db_session()


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise _unauthorized()
    user_id = decode_token(creds.credentials)
    if user_id is None:
        raise _unauthorized("Invalid or expired token")
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        raise _unauthorized("Invalid token subject")
    user = get_user_by_id(db, uid)
    if user is None:
        raise _unauthorized("User no longer exists")
    return user


def get_current_admin(current: User = Depends(get_current_user)) -> User:
    """Decision gate: admin + welfare_officer + collector + sys_admin (PRD §8 hard rule).

    Auditors / data officers / hospital partners are read-only and get 403 here.
    """
    if current.role.value not in OFFICER_ROLES:
        if current.role.value == "hospital_partner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hospital partners are limited to authorized FHIR exchange only",
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officer access required")
    return current


def get_current_officer_reader(current: User = Depends(get_current_user)) -> User:
    """Read gate: decision roles + data_officer + auditor (PRD least privilege)."""
    if current.role.value not in READ_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officer access required")
    return current
