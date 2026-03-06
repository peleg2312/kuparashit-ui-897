from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Callable

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str, *, field_name: str = "value") -> str:
    normalized = str(value or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} is required.")

    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise HTTPException(status_code=400, detail=f"{field_name} must contain letters or numbers.")
    return slug


def normalize_collection_name(value: str, *, field_name: str = "collectionName") -> str:
    normalized = str(value or "").strip()
    if not normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} is required.")
    if "\x00" in normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} contains invalid null character.")
    if "$" in normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot contain '$'.")
    if "/" in normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot contain '/'.")
    if normalized.startswith("system."):
        raise HTTPException(status_code=400, detail=f"{field_name} cannot start with 'system.'.")
    return normalized


def name_key(value: str) -> str:
    return slugify(value, field_name="name")


def require_team(
    team: str,
    *,
    resolve_team_name: Callable[[str], str | None],
    allowed_teams: set[str] | None = None,
) -> str:
    resolved_team = resolve_team_name(team)
    if not resolved_team:
        raise HTTPException(status_code=400, detail=f"Unknown team: {team}")
    if allowed_teams is not None and resolved_team not in allowed_teams:
        raise HTTPException(status_code=403, detail=f"Catalog is not enabled for team: {resolved_team}")
    return resolved_team


def normalize_visibility_teams(
    teams: list[str] | None,
    *,
    current_team: str,
    resolve_team_name: Callable[[str], str | None],
    field_name: str = "teams",
) -> list[str]:
    if teams is None:
        return [current_team]

    if not isinstance(teams, list):
        raise HTTPException(status_code=400, detail=f"{field_name} must be an array of team names.")

    normalized: list[str] = []
    seen: set[str] = set()
    for raw_team in teams:
        candidate = str(raw_team or "").strip()
        if not candidate:
            raise HTTPException(status_code=400, detail=f"{field_name} cannot contain empty values.")
        resolved_team = resolve_team_name(candidate)
        if not resolved_team:
            raise HTTPException(status_code=400, detail=f"Unknown team in {field_name}: {candidate}")
        if resolved_team in seen:
            continue
        seen.add(resolved_team)
        normalized.append(resolved_team)

    if not normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} must include at least one team.")

    return normalized


def normalize_object_teams(
    teams: list[str] | None,
    *,
    current_team: str,
    resolve_team_name: Callable[[str], str | None],
) -> list[str]:
    return normalize_visibility_teams(
        teams,
        current_team=current_team,
        resolve_team_name=resolve_team_name,
        field_name="teams",
    )


def validate_value_by_type(value: Any, field_type: str, field_key: str) -> None:
    if value is None:
        return

    if field_type == "string":
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail=f"Field '{field_key}' must be a string.")
        return

    if field_type == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise HTTPException(status_code=400, detail=f"Field '{field_key}' must be a number.")
        return

    if field_type == "boolean":
        if not isinstance(value, bool):
            raise HTTPException(status_code=400, detail=f"Field '{field_key}' must be a boolean.")
        return

    if field_type == "url":
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail=f"Field '{field_key}' must be a URL string.")
        return

    if field_type == "array":
        if not isinstance(value, list):
            raise HTTPException(status_code=400, detail=f"Field '{field_key}' must be an array.")
        return

    if field_type == "dict":
        if not isinstance(value, dict):
            raise HTTPException(status_code=400, detail=f"Field '{field_key}' must be an object.")
        return

    raise HTTPException(status_code=400, detail=f"Unsupported field type for '{field_key}': {field_type}")


def normalize_fields(fields: list[Any], *, allowed_field_types: set[str]) -> list[dict[str, Any]]:
    normalized_fields: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for index, field in enumerate(fields or [], start=1):
        candidate_key = str(getattr(field, "key", "") or getattr(field, "label", "") or "").strip()
        key = slugify(candidate_key, field_name="field key")

        if key in seen_keys:
            raise HTTPException(status_code=400, detail=f"Duplicate field key: {key}")

        field_type = str(getattr(field, "type", "") or "").strip().lower()
        if field_type not in allowed_field_types:
            raise HTTPException(status_code=400, detail=f"Unsupported field type for '{key}': {field_type}")

        label = str(getattr(field, "label", "") or getattr(field, "key", "") or "").strip()
        if not label:
            raise HTTPException(status_code=400, detail=f"field label is required for key '{key}'")

        normalized_fields.append(
            {
                "key": key,
                "label": label,
                "type": field_type,
                "active": True,
                "order": index,
            }
        )
        seen_keys.add(key)

    return normalized_fields


def active_fields(type_doc: dict[str, Any]) -> list[dict[str, Any]]:
    fields = type_doc.get("fields", [])
    if not isinstance(fields, list):
        return []

    active = [field for field in fields if isinstance(field, dict) and bool(field.get("active"))]
    return sorted(active, key=lambda field: int(field.get("order") or 0))


def normalize_object_values(values: dict[str, Any] | None, *, type_doc: dict[str, Any]) -> dict[str, Any]:
    raw_values = values or {}
    if not isinstance(raw_values, dict):
        raise HTTPException(status_code=400, detail="values must be an object.")

    normalized_values: dict[str, Any] = {}
    active_fields_by_key = {str(field.get("key")): field for field in active_fields(type_doc)}
    unknown_keys = [key for key in raw_values.keys() if key not in active_fields_by_key]
    if unknown_keys:
        raise HTTPException(
            status_code=400,
            detail=f"values contains unknown field(s): {', '.join(sorted(map(str, unknown_keys)))}",
        )

    for key, field in active_fields_by_key.items():
        field_type = str(field.get("type") or "").strip().lower()
        value = raw_values.get(key)
        validate_value_by_type(value, field_type, key)
        normalized_values[key] = value if key in raw_values else None

    return normalized_values


def merge_fields(
    existing_fields: list[dict[str, Any]],
    requested_active_fields: list[dict[str, Any]],
    *,
    allowed_field_types: set[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    merged_fields: list[dict[str, Any]] = []
    new_field_keys: list[str] = []
    requested_keys: set[str] = set()
    existing_map = {
        str(field.get("key")): field
        for field in existing_fields or []
        if isinstance(field, dict) and str(field.get("key") or "").strip()
    }

    for index, requested in enumerate(requested_active_fields, start=1):
        key = str(requested["key"])
        requested_keys.add(key)
        if key not in existing_map:
            new_field_keys.append(key)
        merged_fields.append(
            {
                "key": key,
                "label": requested["label"],
                "type": requested["type"],
                "active": True,
                "order": index,
            }
        )

    for field in existing_fields or []:
        if not isinstance(field, dict):
            continue

        key = str(field.get("key") or "").strip()
        if not key or key in requested_keys:
            continue

        field_type = str(field.get("type") or "").strip().lower()
        if field_type not in allowed_field_types:
            field_type = "string"

        merged_fields.append(
            {
                "key": key,
                "label": str(field.get("label") or key),
                "type": field_type,
                "active": False,
                "order": int(field.get("order") or (len(merged_fields) + 1)),
            }
        )

    return merged_fields, new_field_keys


def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(str(value or "").strip())
    except (InvalidId, TypeError, ValueError) as error:
        raise HTTPException(status_code=400, detail=f"Invalid object id: {value}") from error
