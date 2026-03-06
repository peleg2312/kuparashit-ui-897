from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CatalogFieldPayload(BaseModel):
    key: str
    label: str
    type: str


class CatalogTypeCreatePayload(BaseModel):
    displayName: str
    fields: list[CatalogFieldPayload] = Field(default_factory=list)
    teams: list[str] | None = None


class CatalogTypeUpdatePayload(BaseModel):
    displayName: str | None = None
    fields: list[CatalogFieldPayload]
    teams: list[str] | None = None


class CatalogObjectUpsertPayload(BaseModel):
    name: str
    url: str | None = None
    values: dict[str, Any] | None = None
    teams: list[str] | None = None
