"""Public auth: citizen register/login + admin login + /me."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_current_user, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.crud.user import (
    get_user_by_email,
    get_user_by_identifier,
    identifier_taken,
)
from app.models.user import IdType, User, UserRole
from app.schemas.auth import AdminLoginRequest, LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.utils.aadhaar import hash_aadhaar, mask_aadhaar, normalize_aadhaar, normalize_gov_id

router = APIRouter(prefix="/auth", tags=["auth"])


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


@router.post("/admin/login", response_model=TokenResponse, summary="Admin/officer login")
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = get_user_by_email(db, str(payload.email))
    if user is None or user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserOut, summary="Current logged-in user")
def read_me(current: User = Depends(get_current_user)) -> User:
    return current


@router.get("/admin/me", response_model=UserOut, summary="Current logged-in admin")
def read_admin_me(admin: User = Depends(get_current_admin)) -> User:
    return admin
