"""Scheme catalog: public read for citizens, admin write."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.crud.scheme import get_scheme, list_active_schemes, list_all_schemes
from app.models.scheme import Scheme
from app.schemas.scheme import SchemeCreate, SchemeOut, SchemeUpdate

router = APIRouter(prefix="/schemes", tags=["schemes"])


@router.get("", response_model=list[SchemeOut], summary="List active schemes (citizen catalog)")
def list_schemes(db: Session = Depends(get_db)) -> list[Scheme]:
    return list_active_schemes(db)


@router.get("/all", response_model=list[SchemeOut], summary="List all schemes incl. inactive (admin)")
def list_schemes_all(db: Session = Depends(get_db), admin=Depends(get_current_admin)) -> list[Scheme]:
    return list_all_schemes(db)


@router.get("/{scheme_id}", response_model=SchemeOut)
def get_scheme_detail(scheme_id: int, db: Session = Depends(get_db)) -> Scheme:
    scheme = get_scheme(db, scheme_id)
    if scheme is None or not scheme.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return scheme


@router.post("", response_model=SchemeOut, status_code=status.HTTP_201_CREATED)
def create_scheme(payload: SchemeCreate, db: Session = Depends(get_db),
                  admin=Depends(get_current_admin)) -> Scheme:
    if db.query(Scheme).filter(Scheme.name == payload.name.strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Scheme name already exists")
    scheme = Scheme(name=payload.name.strip(), description=payload.description.strip(),
                    eligibility=(payload.eligibility or "").strip(), is_active=payload.is_active)
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


@router.patch("/{scheme_id}", response_model=SchemeOut)
def update_scheme(scheme_id: int, payload: SchemeUpdate, db: Session = Depends(get_db),
                  admin=Depends(get_current_admin)) -> Scheme:
    scheme = get_scheme(db, scheme_id)
    if scheme is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(scheme, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(scheme)
    return scheme
