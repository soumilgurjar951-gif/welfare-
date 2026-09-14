"""Admin panel API: dashboard stats, filtered list, detail, approve/reject, logs, CSV."""

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.crud.application import admin_list_applications, count_by_status, get_application
from app.crud.scheme import list_all_schemes
from app.models.admin_log import AdminLog
from app.models.application import ApplicationStatus
from app.models.user import User
from app.schemas.application import (
    AdminLogOut,
    ApplicationDetailOut,
    ApplicationOut,
    ApproveRequest,
    DashboardStats,
    DocumentOut,
    RejectRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _detail(app) -> ApplicationDetailOut:
    base = ApplicationOut(
        id=app.id, user_id=app.user_id, scheme_id=app.scheme_id, reason=app.reason,
        status=app.status.value, rejection_reason=app.rejection_reason,
        benefit_amount=app.benefit_amount, remarks=app.remarks, admin_id=app.admin_id,
        decided_at=app.decided_at, created_at=app.created_at,
        scheme_name=app.scheme.name if app.scheme else None,
        documents=[DocumentOut.model_validate(d) for d in (app.documents or [])],
    )
    return ApplicationDetailOut(
        **base.model_dump(),
        user=app.user,
        admin_name=app.admin.name if app.admin else None,
    )


@router.get("/stats", response_model=DashboardStats, summary="Total / Pending / Approved / Rejected")
def stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return DashboardStats(**count_by_status(db))


@router.get("/applications", response_model=dict, summary="Filtered, searchable, paginated list")
def list_applications(
    status: str | None = Query(default=None, description="Pending | Approved | Rejected"),
    scheme_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = Query(default=None, description="Name / masked Aadhaar / gov ID / email / phone / scheme"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    rows, total = admin_list_applications(
        db, status=status, scheme_id=scheme_id, date_from=date_from, date_to=date_to,
        search=search, limit=page_size, offset=(page - 1) * page_size,
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": a.id,
                "citizen_name": a.user.name if a.user else "—",
                "aadhaar_masked": a.user.aadhaar_masked if a.user else None,
                "other_gov_id": a.user.other_gov_id if a.user else None,
                "scheme_name": a.scheme.name if a.scheme else "—",
                "scheme_id": a.scheme_id,
                "status": a.status.value,
                "created_at": a.created_at,
                "decided_at": a.decided_at,
            }
            for a in rows
        ],
    }


@router.get("/applications/export", summary="CSV export of filtered applications")
def export_csv(
    status: str | None = None,
    scheme_id: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    rows, _ = admin_list_applications(db, status=status, scheme_id=scheme_id, search=search,
                                      limit=2000, offset=0)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "citizen", "aadhaar_masked", "gov_id", "email", "phone",
                "scheme", "status", "reason", "benefit_amount", "created_at", "decided_at"])
    for a in rows:
        u = a.user
        w.writerow([a.id, u.name if u else "", u.aadhaar_masked if u else "",
                    u.other_gov_id if u else "", u.email if u else "", u.phone if u else "",
                    a.scheme.name if a.scheme else "", a.status.value, a.reason,
                    a.benefit_amount or "", a.created_at, a.decided_at or ""])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=applications.csv"})


@router.get("/applications/{app_id}", response_model=ApplicationDetailOut,
            summary="Full detail: citizen + scheme + reason + documents")
def application_detail(app_id: int, db: Session = Depends(get_db),
                       admin: User = Depends(get_current_admin)):
    app = get_application(db, app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return _detail(app)


def _decide(db: Session, app_id: int, admin: User, action: str,
            remarks: str | None, benefit=None, rejection_reason: str | None = None):
    from datetime import datetime, timezone
    app = get_application(db, app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if app.status != ApplicationStatus.pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Application is already {app.status.value}")
    app.status = ApplicationStatus.approved if action == "Approved" else ApplicationStatus.rejected
    app.admin_id = admin.id
    app.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)
    app.remarks = (remarks or "").strip() or None
    app.benefit_amount = benefit
    app.rejection_reason = rejection_reason
    db.add(AdminLog(admin_id=admin.id, application_id=app.id, action=action,
                    remarks=(remarks or rejection_reason or "").strip() or None))
    db.commit()
    full = get_application(db, app.id)
    assert full is not None

    # Dispatch SMS & Email Alerts to Citizen
    try:
        if full.user:
            from app.utils.notification import dispatch_notification
            scheme_name = full.scheme.name if full.scheme else f"Scheme #{full.scheme_id}"
            if action == "Approved":
                amount_str = f" — Sanctioned Benefit: ₹{benefit:,.2f}" if benefit else ""
                dispatch_notification(
                    db,
                    user=full.user,
                    title=f"🎉 Application Approved: #{full.id}",
                    message=f"Great news! Your application for '{scheme_name}' has been APPROVED.{amount_str}",
                    channel="ALL",
                )
            else:
                reason_str = f" Reason: {rejection_reason}" if rejection_reason else ""
                dispatch_notification(
                    db,
                    user=full.user,
                    title=f"Application Declined: #{full.id}",
                    message=f"Your application for '{scheme_name}' (ID: #{full.id}) was declined.{reason_str}",
                    channel="ALL",
                )
    except Exception as e:
        print(f"Notification error: {e}")

    return _detail(full)



@router.post("/applications/{app_id}/approve", response_model=ApplicationDetailOut,
             summary="Approve + optional benefit amount + remarks")
def approve(app_id: int, payload: ApproveRequest, db: Session = Depends(get_db),
            admin: User = Depends(get_current_admin)):
    return _decide(db, app_id, admin, "Approved", payload.remarks, benefit=payload.benefit_amount)


@router.post("/applications/{app_id}/reject", response_model=ApplicationDetailOut,
             summary="Reject (rejection reason mandatory)")
def reject(app_id: int, payload: RejectRequest, db: Session = Depends(get_db),
           admin: User = Depends(get_current_admin)):
    return _decide(db, app_id, admin, "Rejected", payload.remarks,
                   rejection_reason=payload.rejection_reason.strip())


@router.get("/logs", response_model=list[AdminLogOut], summary="Full audit log of decisions")
def audit_logs(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db),
               admin: User = Depends(get_current_admin)):
    rows = (db.query(AdminLog).order_by(AdminLog.created_at.desc()).limit(limit).all())
    out: list[AdminLogOut] = []
    for r in rows:
        item = AdminLogOut.model_validate(r)
        item.admin_name = r.admin.name if r.admin else None
        out.append(item)
    return out


@router.get("/schemes", summary="Scheme list for admin filters")
def admin_schemes(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return [{"id": s.id, "name": s.name, "is_active": s.is_active} for s in list_all_schemes(db)]
