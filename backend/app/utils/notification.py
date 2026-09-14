import logging
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger("notification")

def dispatch_notification(
    db: Session,
    user: User,
    title: str,
    message: str,
    channel: str = "IN_APP",  # IN_APP, SMS, EMAIL, ALL
):
    """
    Creates notification record in database and triggers SMS & Email dispatch simulation.
    """
    notifs = []
    
    # 1. In-App Notification Record
    notif = Notification(
        user_id=user.id,
        title=title,
        message=message,
        channel=channel,
        recipient=user.phone if channel == "SMS" else user.email if channel == "EMAIL" else None,
        is_read=False,
    )
    db.add(notif)
    notifs.append(notif)
    
    db.commit()
    for n in notifs:
        db.refresh(n)

    # 2. Simulated SMS & Email Logging
    if user.phone:
        logger.info(f"📱 [SMS SENT TO {user.phone}] {title}: {message}")
        print(f"📱 [SMS ALERT -> {user.phone}] Header: '{title}' | Msg: '{message}'")
        
    if user.email:
        logger.info(f"📧 [EMAIL SENT TO {user.email}] {title}: {message}")
        print(f"📧 [EMAIL ALERT -> {user.email}] Subject: '{title}' | Body: '{message}'")

    return notifs[0]
