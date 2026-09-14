"""Citizen application endpoints: apply (multipart + docs), history, detail."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.crud.application import get_application, has_pending_for_scheme, list_user_applications
from app.crud.scheme import get_scheme
from app.models.application import Application
from app.models.document import Document
from app.models.user import User
from app.schemas.application import ApplicationOut, DocumentOut
from app.utils.files import save_upload

router = APIRouter(prefix="/applications", tags=["applications"])


def _to_out(app: Application) -> ApplicationOut:
    return ApplicationOut(
        id=app.id, user_id=app.user_id, scheme_id=app.scheme_id, reason=app.reason,
        status=app.status.value, rejection_reason=app.rejection_reason,
        benefit_amount=app.benefit_amount, remarks=app.remarks, admin_id=app.admin_id,
        decided_at=app.decided_at, created_at=app.created_at,
        scheme_name=app.scheme.name if app.scheme else None,
        documents=[
            DocumentOut.model_validate(d) for d in (app.documents or [])
        ],
    )


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED,
             summary="Apply for a scheme (reason + optional documents)")
async def apply_for_scheme(
    scheme_id: int = Form(...),
    reason: str = Form(...),
    files: list[UploadFile] | None = File(default=None),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ApplicationOut:
    reason = (reason or "").strip()
    if len(reason) < 10:
        raise HTTPException(status_code=422, detail="Reason must be at least 10 characters")
    if len(reason) > 2000:
        raise HTTPException(status_code=422, detail="Reason must be under 2000 characters")

    scheme = get_scheme(db, scheme_id)
    if scheme is None or not scheme.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found or inactive")
    if has_pending_for_scheme(db, current.id, scheme_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="You already have a pending application for this scheme")

    app = Application(user_id=current.id, scheme_id=scheme_id, reason=reason)
    db.add(app)
    db.flush()  # get app.id before saving documents

    for upload in files or []:
        if not upload.filename:
            continue
        meta = await save_upload(upload, subdir=f"app_{app.id}")
        db.add(Document(application_id=app.id, **meta))

    db.commit()
    full = get_application(db, app.id)
    assert full is not None

    # Trigger Notifications (SMS + Email + In-App)
    try:
        from app.utils.notification import dispatch_notification
        scheme_title = scheme.name if scheme else f"Scheme #{scheme_id}"
        dispatch_notification(
            db,
            user=current,
            title=f"Application Submitted: #{app.id}",
            message=f"Your application for '{scheme_title}' (ID: #{app.id}) was received successfully. Verification underway.",
            channel="ALL",
        )
    except Exception as e:
        print(f"Notification error: {e}")

    return _to_out(full)



@router.get("/me", response_model=list[ApplicationOut], summary="My applications + status tracking")
def my_applications(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return [_to_out(a) for a in list_user_applications(db, current.id)]


@router.get("/{app_id}", response_model=ApplicationOut, summary="My single application detail")
def my_application_detail(app_id: int, db: Session = Depends(get_db),
                           current: User = Depends(get_current_user)):
    app = get_application(db, app_id)
    if app is None or app.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return _to_out(app)
