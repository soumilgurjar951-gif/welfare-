"""Self-service citizen profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import ProfileUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_profile(current: User = Depends(get_current_user)) -> User:
    return current


@router.patch("/me", response_model=UserOut)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db),
                   current: User = Depends(get_current_user)) -> User:
    user = db.get(User, current.id)
    assert user is not None
    if payload.name is not None:
        name = payload.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=422, detail="Name too short")
        user.name = name
    if payload.phone is not None:
        digits = "".join(c for c in payload.phone if c.isdigit())
        if len(digits) < 10:
            raise HTTPException(status_code=422, detail="Invalid phone number")
        phone = digits[-10:]
        exists = db.query(User).filter(User.phone == phone, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already in use")
        user.phone = phone
    if payload.address is not None:
        if len(payload.address.strip()) < 5:
            raise HTTPException(status_code=422, detail="Address too short")
        user.address = payload.address.strip()
    db.commit()
    db.refresh(user)
    return user
