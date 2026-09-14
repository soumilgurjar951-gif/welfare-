"""Aadhaar + government-ID helpers.

Security note: raw Aadhaar numbers are NEVER persisted. Only a SHA-256 hash
(for uniqueness / login lookup) and a masked display form (XXXX-XXXX-1234)
are stored. Masked values are safe to show in the UI and admin panel.
"""

import hashlib
import re

from app.core.config import settings

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
VOTER_RE = re.compile(r"^[A-Z]{3}[0-9]{7}$")
DL_RE = re.compile(r"^[A-Z]{2}[0-9A-Z]{4,18}$")


def normalize_aadhaar(value: str) -> str:
    """Strip spaces/dashes -> 12 digits."""
    return re.sub(r"[\s-]", "", value or "")


def is_valid_aadhaar(value: str) -> bool:
    digits = normalize_aadhaar(value)
    if not re.fullmatch(r"\d{12}", digits):
        return False
    # UIDAI never issues numbers starting with 0/1.
    if digits[0] in ("0", "1"):
        return False
    return True


def mask_aadhaar(digits: str) -> str:
    """XXXX-XXXX-1234"""
    d = normalize_aadhaar(digits)
    return f"XXXX-XXXX-{d[-4:]}"


def hash_aadhaar(digits: str) -> str:
    """One-way hash with server secret as pepper (not reversible)."""
    d = normalize_aadhaar(digits)
    return hashlib.sha256(f"{d}:{settings.SECRET_KEY}".encode()).hexdigest()


def validate_other_gov_id(id_type: str, value: str) -> bool:
    v = (value or "").strip().upper()
    if id_type == "pan":
        return bool(PAN_RE.fullmatch(v))
    if id_type == "voter":
        return bool(VOTER_RE.fullmatch(v))
    if id_type == "dl":
        return bool(DL_RE.fullmatch(v))
    return False


def normalize_gov_id(value: str) -> str:
    return (value or "").strip().upper()
