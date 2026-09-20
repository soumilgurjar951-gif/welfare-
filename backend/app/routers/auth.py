"""Public auth: citizen register/login + admin login + /me."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_mfa_pre_token,
    get_password_hash,
    parse_mfa_pre_token,
    revoke_token,
    verify_password,
)
from app.crud.user import (
    get_user_by_email,
    get_user_by_identifier,
    identifier_taken,
)
from app.models.user import IdType, User, UserRole
from app.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    LoginRequest,
    MfaCodeRequest,
    MfaDisableRequest,
    MfaSetupOut,
    MfaStatusOut,
    MfaVerifyRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.utils.aadhaar import hash_aadhaar, mask_aadhaar, normalize_aadhaar, normalize_gov_id

router = APIRouter(prefix="/auth", tags=["auth"])

_bearer = HTTPBearer(auto_error=False)


def _bearer_token(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return creds.credentials


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="Register a citizen with Aadhaar or another gov ID")
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    aadhaar_hash: str | None = None
    aadhaar_masked: str | None = None
    gov_id: str | None = None

    if payload.id_type == "aadhaar":
        digits = normalize_aadhaar(payload.aadhaar_number or "")
        aadhaar_hash = hash_aadhaar(digits)
        aadhaar_masked = mask_aadhaar(digits)
    else:
        gov_id = normalize_gov_id(payload.other_gov_id or "")

    conflict = identifier_taken(
        db, email=str(payload.email), phone=payload.phone,
        aadhaar_hash=aadhaar_hash, gov_id=gov_id,
    )
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict)

    user = User(
        name=payload.name.strip(),
        id_type=IdType(payload.id_type),
        aadhaar_hash=aadhaar_hash,
        aadhaar_masked=aadhaar_masked,
        other_gov_id=gov_id,
        phone=payload.phone,
        email=str(payload.email).strip().lower(),
        address=payload.address.strip(),
        dob=payload.dob,
        role=UserRole.citizen,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse, summary="Citizen login (gov ID + password)")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = get_user_by_identifier(db, payload.identifier)
    if user is None or user.role != UserRole.citizen:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ID or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ID or password")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/admin/login", response_model=AdminLoginResponse, summary="Officer login (any officer role)")
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)) -> AdminLoginResponse:
    from app.models.user import OFFICER_ROLES, READ_ROLES
    from app.services.audit import log_event

    user = get_user_by_email(db, str(payload.email))
    if user is None or user.role.value not in (OFFICER_ROLES | READ_ROLES):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid officer credentials")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid officer credentials")
    if user.mfa_enabled:
        log_event(db, actor=user, action="mfa.challenged",
                  entity_type="auth", entity_id=str(user.id))
        return AdminLoginResponse(mfa_required=True,
                                  pre_token=create_mfa_pre_token(user.id))
    return AdminLoginResponse(mfa_required=False,
                              access_token=create_access_token(str(user.id)))


@router.post("/refresh", response_model=TokenResponse, summary="Rotate access token")
def refresh(current: User = Depends(get_current_user)) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(str(current.id)))


@router.post("/logout", summary="Revoke current session token")
def logout(token: str = Depends(_bearer_token)) -> dict:
    revoke_token(token)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut, summary="Current logged-in user")
def read_me(current: User = Depends(get_current_user)) -> User:
    return current


@router.get("/admin/me", response_model=UserOut, summary="Current logged-in admin")
def read_admin_me(admin: User = Depends(get_current_admin)) -> User:
    return admin


# ── Officer MFA (TOTP, CERT-In control) ──────────────────────────────────
def _officer_totp(user: User):
    import pyotp

    if not user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="MFA setup has not been started for this account")
    return pyotp.TOTP(user.mfa_secret)


@router.post("/admin/mfa/setup", response_model=MfaSetupOut, summary="Start MFA enrolment (returns otpauth URI)")
def mfa_setup(db: Session = Depends(get_db),
              admin: User = Depends(get_current_admin)) -> MfaSetupOut:
    import pyotp

    from app.services.audit import log_event

    if admin.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="MFA is already enabled")
    secret = pyotp.random_base32()
    admin.mfa_secret = secret
    db.commit()
    log_event(db, actor=admin, action="mfa.setup_started",
              entity_type="auth", entity_id=str(admin.id))
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=admin.email, issuer_name="Scheme Sync")
    return MfaSetupOut(otpauth_uri=uri, manual_secret=secret)


@router.post("/admin/mfa/enable", response_model=MfaStatusOut, summary="Confirm enrolment with a TOTP code")
def mfa_enable(payload: MfaCodeRequest, db: Session = Depends(get_db),
               admin: User = Depends(get_current_admin)) -> MfaStatusOut:
    from app.services.audit import log_event

    totp = _officer_totp(admin)
    if not totp.verify(payload.code.strip().replace(" ", ""), valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authenticator code")
    admin.mfa_enabled = True
    db.commit()
    log_event(db, actor=admin, action="mfa.enabled",
              entity_type="auth", entity_id=str(admin.id))
    return MfaStatusOut(enabled=True)


@router.post("/admin/mfa/disable", response_model=MfaStatusOut, summary="Disable MFA (password confirmed)")
def mfa_disable(payload: MfaDisableRequest, db: Session = Depends(get_db),
                admin: User = Depends(get_current_admin)) -> MfaStatusOut:
    from app.services.audit import log_event

    if not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password incorrect")
    admin.mfa_enabled = False
    admin.mfa_secret = None
    db.commit()
    log_event(db, actor=admin, action="mfa.disabled",
              entity_type="auth", entity_id=str(admin.id))
    return MfaStatusOut(enabled=False)


@router.get("/admin/mfa/status", response_model=MfaStatusOut, summary="MFA enrolment status")
def mfa_status(admin: User = Depends(get_current_admin)) -> MfaStatusOut:
    return MfaStatusOut(enabled=bool(admin.mfa_enabled))


@router.post("/admin/mfa/verify", response_model=TokenResponse, summary="Second factor: exchange pre-token + TOTP for session")
def mfa_verify(payload: MfaVerifyRequest, db: Session = Depends(get_db)) -> TokenResponse:
    from app.crud.user import get_user_by_id
    from app.models.user import OFFICER_ROLES, READ_ROLES
    from app.services.audit import log_event

    uid = parse_mfa_pre_token(payload.pre_token)
    if uid is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Login session expired — sign in again")
    user = get_user_by_id(db, uid)
    if user is None or user.role.value not in (OFFICER_ROLES | READ_ROLES):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    if not user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="MFA is not enabled on this account — sign in normally")
    totp = _officer_totp(user)
    if not totp.verify(payload.code.strip().replace(" ", ""), valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authenticator code")
    revoke_token(payload.pre_token)  # single-use step-up token
    log_event(db, actor=user, action="mfa.login",
              entity_type="auth", entity_id=str(user.id))
    return TokenResponse(access_token=create_access_token(str(user.id)))
