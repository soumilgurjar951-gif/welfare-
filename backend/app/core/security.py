"""Password hashing + JWT helpers (python-jose + passlib/bcrypt)."""

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt via passlib. Pin bcrypt==4.0.1 in requirements (passlib compat).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory token blacklist (logout/session revocation, PRD §13).
# NOTE: single-process demo store — production must use Redis/DB.
_revoked_jti: set[str] = set()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode(
        {"sub": subject, "exp": expire, "iat": now, "jti": uuid.uuid4().hex},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_claims(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def revoke_token(token: str) -> bool:
    claims = decode_claims(token)
    if not claims or "jti" not in claims:
        return False
    _revoked_jti.add(claims["jti"])
    return True


def is_revoked(token: str) -> bool:
    claims = decode_claims(token)
    if not claims:
        return True
    return claims.get("jti") in _revoked_jti


def decode_token(token: str) -> str | None:
    """Return the `sub` (user id) if the token is valid and not revoked, else None."""
    if is_revoked(token):
        return None
    claims = decode_claims(token)
    if not claims:
        return None
    sub = claims.get("sub")
    return sub if isinstance(sub, str) else None


MFA_PRE_PREFIX = "mfa-pending:"
MFA_PRE_MINUTES = 5


def create_mfa_pre_token(user_id: int) -> str:
    """Short-lived step-up token for the MFA second factor.

    The sub is namespaced so normal auth deps reject it (int() parse fails
    in get_current_user) — it is ONLY accepted by the MFA verify endpoint.
    """
    return create_access_token(
        f"{MFA_PRE_PREFIX}{user_id}", expires_delta=timedelta(minutes=MFA_PRE_MINUTES)
    )


def parse_mfa_pre_token(token: str) -> int | None:
    """Return the user id if this is a valid, unrevoked, unexpired pre-token."""
    if is_revoked(token):
        return None
    claims = decode_claims(token)
    if not claims:
        return None
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub.startswith(MFA_PRE_PREFIX):
        return None
    try:
        return int(sub[len(MFA_PRE_PREFIX):])
    except ValueError:
        return None
