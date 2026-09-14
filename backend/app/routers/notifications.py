from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationsResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=NotificationsResponse, summary="Get citizen notifications with unread count")
def get_my_notifications(
    db: Session = Depends(get_db),
    citizen: User = Depends(get_current_user),
):
    items = (
        db.query(Notification)
        .filter(Notification.user_id == citizen.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == citizen.id, Notification.is_read == False)
        .count()
    )
    return NotificationsResponse(
        unread_count=unread_count,
        items=[NotificationOut.model_validate(n) for n in items],
    )

@router.patch("/{notification_id}/read", response_model=NotificationOut, summary="Mark a single notification as read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    citizen: User = Depends(get_current_user),
):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == citizen.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationOut.model_validate(notif)

@router.post("/mark-all-read", summary="Mark all unread notifications as read")
def mark_all_read(
    db: Session = Depends(get_db),
    citizen: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == citizen.id, Notification.is_read == False
    ).update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}
