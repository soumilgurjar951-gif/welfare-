"""Scheme schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SchemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    eligibility: str = ""
    required_documents: str | None = None
    is_active: bool
    created_at: datetime


class SchemeCreate(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=5, max_length=5000)
    eligibility: str = Field(default="", max_length=5000)
    required_documents: str | None = None
    is_active: bool = True


class SchemeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, min_length=5, max_length=5000)
    eligibility: str | None = None
    required_documents: str | None = None
    is_active: bool | None = None

