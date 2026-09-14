"""Local file-upload helpers (swap for S3/GCS later behind this interface)."""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".webp",
    ".doc", ".docx", ".txt",
}
ALLOWED_MIME_PREFIXES = ("application/pdf", "image/", "text/", "application/msword",
                         "application/vnd.openxmlformats")


def upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _ensure_safe_extension(filename: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {ext or 'unknown'} not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )
    return ext


async def save_upload(file: UploadFile, subdir: str = "") -> dict:
    """Persist an UploadFile to disk; returns metadata dict."""
    ext = _ensure_safe_extension(file.filename or "")
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024

    dest_dir = upload_root() / subdir if subdir else upload_root()
    dest_dir.mkdir(parents=True, exist_ok=True)

    name = f"{uuid.uuid4().hex}{ext}"
    dest = dest_dir / name

    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit",
                )
            out.write(chunk)

    rel = dest.as_posix()
    return {
        "file_path": rel,
        "file_name": file.filename or name,
        "file_type": file.content_type or "application/octet-stream",
        "file_size": size,
    }
