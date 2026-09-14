"""Model package — import all models so relationships resolve."""

from app.models.admin_log import AdminLog  # noqa: F401
from app.models.application import Application, ApplicationStatus  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.scheme import Scheme  # noqa: F401
from app.models.user import IdType, User, UserRole  # noqa: F401

