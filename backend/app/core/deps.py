"""Auth dependencies: current user + role-gated admin dependency."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.crud.user import get_user_by_id
from app.db.session import get_db_session
from app.models.user import User, UserRole

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
    """Role gate: only users with role=admin may access /api/admin/*."""
    if current.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current
