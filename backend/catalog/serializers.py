from __future__ import annotations

from typing import Any


def serialize_type(
    doc: dict[str, Any],
    *,
    object_count: int | None = None,
    mongo_db_name: str | None = None,
) -> dict[str, Any]:
    fields = doc.get("fields", [])
    sorted_fields = sorted(
        [field for field in fields if isinstance(field, dict)],
        key=lambda field: int(field.get("order") or 0),
    )
    collection_name = str(doc.get("collectionName") or "")
    teams = doc.get("teams", [])
    if not isinstance(teams, list):
        teams = []
    safe_teams = []
    seen_teams = set()
    for team in teams:
        candidate = str(team or "").strip()
        if not candidate or candidate in seen_teams:
            continue
        seen_teams.add(candidate)
        safe_teams.append(candidate)

    result = {
        "id": str(doc.get("_id") or ""),
        "team": "SHARED",
        "typeKey": collection_name,
        "displayName": collection_name,
        "collectionName": collection_name,
        "teams": safe_teams,
        "fields": sorted_fields,
        "createdAt": "",
        "updatedAt": "",
    }
    if mongo_db_name:
        result["mongoDbName"] = mongo_db_name
        result["mongoPath"] = f"{mongo_db_name}.{collection_name}" if collection_name else mongo_db_name
    if object_count is not None:
        result["objectCount"] = int(object_count)

    return result


def serialize_object(doc: dict[str, Any], *, active_field_keys: set[str] | None = None) -> dict[str, Any]:
    values = doc.get("values", {})
    if not isinstance(values, dict):
        values = {}

    teams = doc.get("teams", [])
    if not isinstance(teams, list):
        teams = []
    safe_teams = []
    seen_teams = set()
    for team in teams:
        candidate = str(team or "").strip()
        if not candidate or candidate in seen_teams:
            continue
        seen_teams.add(candidate)
        safe_teams.append(candidate)

    if active_field_keys is not None:
        values = {key: values.get(key) for key in sorted(active_field_keys)}

    return {
        "id": str(doc.get("_id") or ""),
        "name": str(doc.get("name") or ""),
        "url": str(doc.get("url") or ""),
        "values": values,
        "teams": safe_teams,
        "createdAt": str(doc.get("createdAt") or ""),
        "updatedAt": str(doc.get("updatedAt") or ""),
    }
