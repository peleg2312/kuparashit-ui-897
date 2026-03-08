from __future__ import annotations

from typing import Any


def _object_value_map(doc: dict[str, Any]) -> dict[str, Any]:
    legacy_values = doc.get("values", {})
    if not isinstance(legacy_values, dict):
        legacy_values = {}

    reserved_keys = {"_id", "name", "nameKey", "url", "team", "teams", "createdAt", "updatedAt", "values"}
    top_level_values = {
        str(key): value
        for key, value in doc.items()
        if str(key) not in reserved_keys
    }
    return {**legacy_values, **top_level_values}


def serialize_type(
    doc: dict[str, Any],
    *,
    object_count: int | None = None,
    mongo_db_name: str | None = None,
    read_only: bool = False,
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
        "readOnly": bool(read_only),
        "createdAt": "",
        "updatedAt": "",
    }
    color_theme = doc.get("colorTheme")
    if (
        isinstance(color_theme, dict)
        and str(color_theme.get("accent") or "").strip()
        and str(color_theme.get("accentAlt") or "").strip()
    ):
        result["colorTheme"] = {
            "accent": str(color_theme.get("accent") or "").strip(),
            "accentAlt": str(color_theme.get("accentAlt") or "").strip(),
        }
    if mongo_db_name:
        result["mongoDbName"] = mongo_db_name
        result["mongoPath"] = f"{mongo_db_name}.{collection_name}" if collection_name else mongo_db_name
    if object_count is not None:
        result["objectCount"] = int(object_count)

    return result


def serialize_object(doc: dict[str, Any], *, active_field_keys: set[str] | None = None) -> dict[str, Any]:
    values = _object_value_map(doc)

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
        keys = set(active_field_keys)
        keys.update(values.keys())
        values = {key: values.get(key) for key in sorted(keys)}

    object_id = str(doc.get("_id") or "").strip()
    object_name = str(doc.get("name") or "").strip() or f"Object {object_id[:8] or 'item'}"

    return {
        "id": str(doc.get("_id") or ""),
        "name": object_name,
        "url": str(doc.get("url") or ""),
        "values": values,
        "teams": safe_teams,
        "createdAt": "",
        "updatedAt": "",
    }


def serialize_generic_object(doc: dict[str, Any], *, active_field_keys: set[str] | None = None) -> dict[str, Any]:
    values = _object_value_map(doc)

    if active_field_keys is not None:
        keys = set(active_field_keys)
        keys.update(values.keys())
        values = {key: values.get(key) for key in sorted(keys)}

    teams = doc.get("teams")
    safe_teams: list[str] = []
    if isinstance(teams, list):
        for team in teams:
            candidate = str(team or "").strip()
            if candidate and candidate not in safe_teams:
                safe_teams.append(candidate)

    if not safe_teams:
        single_team = str(doc.get("team") or "").strip()
        if single_team:
            safe_teams.append(single_team)

    object_name = str(doc.get("name") or "").strip() or f"Object {str(doc.get('_id') or '').strip()}"
    return {
        "id": str(doc.get("_id") or ""),
        "name": object_name,
        "url": str(doc.get("url") or "").strip(),
        "values": values,
        "teams": safe_teams,
        "createdAt": "",
        "updatedAt": "",
    }
