from datetime import datetime
from pydantic import BaseModel

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    channel: str
    recipient: str | None = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationsResponse(BaseModel):
    unread_count: int
    items: list[NotificationOut]
