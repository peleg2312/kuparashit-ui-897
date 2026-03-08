from __future__ import annotations

import os
import hashlib
import secrets
from pathlib import Path
from typing import Any, Callable

from fastapi import HTTPException
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

from .constants import DEFAULT_FIELD_TYPES, DEFAULT_MONGO_DB_NAME, TYPE_DEFINITIONS_COLLECTION
from .repository import CatalogRepository
from .schemas import CatalogObjectUpsertPayload, CatalogTypeCreatePayload, CatalogTypeUpdatePayload
from .serializers import serialize_generic_object, serialize_object, serialize_type
from .validators import (
    active_fields,
    merge_fields,
    normalize_collection_name,
    normalize_fields,
    normalize_object_values,
    normalize_object_teams,
    normalize_visibility_teams,
    parse_object_id,
    require_team,
    slugify,
)

COLLECTION_COLOR_THEMES = [
    {"accent": "#29a36a", "accentAlt": "#168f72"},
    {"accent": "#2f7df4", "accentAlt": "#1e5fd8"},
    {"accent": "#0ea5a4", "accentAlt": "#0f766e"},
    {"accent": "#d97706", "accentAlt": "#ea580c"},
    {"accent": "#d9467a", "accentAlt": "#db2777"},
    {"accent": "#84a114", "accentAlt": "#4d7c0f"},
    {"accent": "#0891b2", "accentAlt": "#2563eb"},
    {"accent": "#c26a2d", "accentAlt": "#b45309"},
    {"accent": "#16a34a", "accentAlt": "#15803d"},
    {"accent": "#2563eb", "accentAlt": "#1d4ed8"},
    {"accent": "#7c3aed", "accentAlt": "#6d28d9"},
    {"accent": "#be123c", "accentAlt": "#e11d48"},
    {"accent": "#0f766e", "accentAlt": "#14b8a6"},
    {"accent": "#475569", "accentAlt": "#334155"},
    {"accent": "#ea580c", "accentAlt": "#c2410c"},
    {"accent": "#3b82f6", "accentAlt": "#06b6d4"},
]


class CatalogService:
    def __init__(
        self,
        *,
        resolve_team_name: Callable[[str], str | None],
        allowed_teams: set[str] | None = None,
        mongo_uri: str | None = None,
        mongo_db_name: str | None = None,
    ) -> None:
        self._resolve_team_name = resolve_team_name
        self._allowed_teams = set(allowed_teams) if allowed_teams is not None else None
        self._allowed_field_types = set(DEFAULT_FIELD_TYPES)

        resolved_mongo_uri = self._resolve_mongo_uri(mongo_uri)
        resolved_db_name = str(
            mongo_db_name
            if mongo_db_name is not None
            else (os.getenv("MONGO_DB_NAME") or self._read_env_file_value("MONGO_DB_NAME") or DEFAULT_MONGO_DB_NAME)
        ).strip() or DEFAULT_MONGO_DB_NAME
        self._repo = CatalogRepository(mongo_uri=resolved_mongo_uri, mongo_db_name=resolved_db_name)

    def list_types(self, team: str) -> dict[str, Any]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        type_collection = self._repo.type_collection(db)

        try:
            type_docs = list(type_collection.find(self._type_visibility_filter(safe_team)).sort("collectionName", ASCENDING))
            managed_by_collection: dict[str, dict[str, Any]] = {}
            results: list[dict[str, Any]] = []

            for type_doc in type_docs:
                type_doc = self._ensure_stored_color_theme(type_collection=type_collection, type_doc=type_doc)
                collection_name = self._collection_name(team=safe_team, type_key="", type_doc=type_doc)
                managed_by_collection[collection_name] = type_doc
                objects_collection = self._repo.objects_collection(db, collection_name)
                visible_docs = self._list_visible_url_docs(objects_collection, safe_team)
                type_doc_for_response = {**type_doc, "collectionName": collection_name}
                if not isinstance(type_doc_for_response.get("fields"), list) or not type_doc_for_response.get("fields"):
                    type_doc_for_response["fields"] = self._infer_fields_from_docs(
                        visible_docs,
                        prefer_values_field=True,
                    )
                results.append(
                    serialize_type(
                        type_doc_for_response,
                        object_count=len(visible_docs),
                        mongo_db_name=self._repo.mongo_db_name,
                        read_only=False,
                    )
                )

            for collection_name in self._collection_names_excluding_meta(db):
                if collection_name in managed_by_collection:
                    continue

                raw_collection = db[collection_name]
                visible_docs = self._list_visible_url_docs(raw_collection, safe_team)
                if not visible_docs:
                    continue

                virtual_type = {
                    "_id": f"raw:{collection_name}",
                    "collectionName": collection_name,
                    "fields": self._infer_fields_from_docs(visible_docs),
                    "teams": [safe_team],
                    "colorTheme": self._fallback_color_theme(collection_name),
                }
                results.append(
                    serialize_type(
                        virtual_type,
                        object_count=len(visible_docs),
                        mongo_db_name=self._repo.mongo_db_name,
                        read_only=True,
                    )
                )
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to load catalog types from MongoDB.") from error

        results.sort(key=lambda item: str(item.get("displayName") or item.get("typeKey") or "").lower())
        return {"types": results}

    def create_type(self, team: str, payload: CatalogTypeCreatePayload) -> dict[str, Any]:
        safe_team = self._require_team(team)
        display_name = str(payload.displayName or "").strip()
        if not display_name:
            raise HTTPException(status_code=400, detail="displayName is required.")

        collection_name = normalize_collection_name(display_name, field_name="displayName")
        visibility_teams = normalize_visibility_teams(
            payload.teams,
            current_team=safe_team,
            resolve_team_name=self._resolve_team_name,
            field_name="teams",
        )
        type_doc = {
            "collectionName": collection_name,
            "fields": normalize_fields(payload.fields, allowed_field_types=self._allowed_field_types),
            "teams": visibility_teams,
            "colorTheme": self._random_color_theme(),
        }

        db = self._repo.db()
        type_collection = self._repo.type_collection(db)
        try:
            existing_doc = type_collection.find_one(
                {"collectionName": collection_name}
            )
            if existing_doc:
                raise HTTPException(status_code=409, detail=f"Collection '{collection_name}' already exists.")
            result = type_collection.insert_one(type_doc)
            type_doc["_id"] = result.inserted_id
            self._repo.objects_collection(db, collection_name)
        except DuplicateKeyError as error:
            raise HTTPException(status_code=409, detail=f"Collection '{collection_name}' already exists.") from error
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to create catalog type in MongoDB.") from error

        return serialize_type(type_doc, object_count=0, mongo_db_name=self._repo.mongo_db_name)

    def update_type(self, team: str, type_key: str, payload: CatalogTypeUpdatePayload) -> dict[str, Any]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        type_collection, type_doc = self._type_or_404(db=db, team=safe_team, type_key=type_key)
        current_collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)
        next_collection_name = normalize_collection_name(
            payload.displayName if payload.displayName is not None else current_collection_name,
            field_name="displayName",
        )
        objects_collection = self._repo.objects_collection(db, current_collection_name)

        next_teams = normalize_visibility_teams(
            payload.teams if payload.teams is not None else type_doc.get("teams"),
            current_team=safe_team,
            resolve_team_name=self._resolve_team_name,
            field_name="teams",
        )

        requested_fields = normalize_fields(payload.fields, allowed_field_types=self._allowed_field_types)
        merged_fields, new_field_keys = merge_fields(
            type_doc.get("fields", []),
            requested_fields,
            allowed_field_types=self._allowed_field_types,
        )
        next_color_theme = self._normalize_color_theme(type_doc.get("colorTheme")) or self._random_color_theme()

        try:
            if next_collection_name != current_collection_name:
                duplicate_doc = type_collection.find_one(
                    {
                        "collectionName": next_collection_name,
                        "_id": {"$ne": type_doc["_id"]},
                    }
                )
                if duplicate_doc:
                    raise HTTPException(status_code=409, detail=f"Collection '{next_collection_name}' already exists.")

                self._repo.rename_collection(db, current_collection_name, next_collection_name)
                objects_collection = self._repo.objects_collection(db, next_collection_name)

            if new_field_keys:
                self._repo.backfill_new_fields(objects_collection, new_field_keys)

            type_collection.update_one(
                {"_id": type_doc["_id"]},
                {
                    "$set": {
                        "collectionName": next_collection_name,
                        "fields": merged_fields,
                        "teams": next_teams,
                        "colorTheme": next_color_theme,
                    }
                },
            )
            updated_doc = type_collection.find_one({"_id": type_doc["_id"]})
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to update catalog type in MongoDB.") from error

        if not updated_doc:
            raise HTTPException(status_code=500, detail="Catalog type update succeeded but reloading failed.")

        return serialize_type(
            updated_doc,
            object_count=objects_collection.count_documents(self._visibility_filter(safe_team)),
            mongo_db_name=self._repo.mongo_db_name,
        )

    def delete_type(self, team: str, type_key: str) -> dict[str, bool]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        type_collection, type_doc = self._type_or_404(db=db, team=safe_team, type_key=type_key)
        collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)

        try:
            type_collection.delete_one({"_id": type_doc["_id"]})
            self._repo.drop_collection(db, collection_name)
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to delete catalog type from MongoDB.") from error

        return {"ok": True}

    def list_objects(self, team: str, type_key: str) -> dict[str, Any]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        lookup_value = str(type_key or "").strip()
        if not lookup_value:
            raise HTTPException(status_code=400, detail="collectionName is required.")

        type_collection = self._repo.type_collection(db)
        type_doc = self._find_type_doc(type_collection=type_collection, team=safe_team, lookup_value=lookup_value)

        if type_doc:
            type_doc = self._ensure_stored_color_theme(type_collection=type_collection, type_doc=type_doc)
            collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)
            objects_collection = self._repo.objects_collection(db, collection_name)
            read_only = False
        else:
            collection_name = normalize_collection_name(lookup_value, field_name="collectionName")
            if collection_name not in self._collection_names_excluding_meta(db):
                raise HTTPException(status_code=404, detail=f"Catalog collection '{lookup_value}' not found.")
            objects_collection = db[collection_name]
            read_only = True

        try:
            docs = self._list_visible_url_docs(objects_collection, safe_team)
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to load catalog objects from MongoDB.") from error

        docs.sort(key=lambda doc: str(doc.get("name") or doc.get("_id") or "").lower())
        inferred_fields = self._infer_fields_from_docs(docs, prefer_values_field=not read_only)
        inferred_field_keys = {str(field.get("key")) for field in inferred_fields if str(field.get("key") or "").strip()}

        if read_only:
            objects = [serialize_generic_object(doc, active_field_keys=inferred_field_keys) for doc in docs]
            type_doc_for_response = {
                "_id": f"raw:{collection_name}",
                "collectionName": collection_name,
                "fields": inferred_fields,
                "teams": [safe_team],
                "colorTheme": self._fallback_color_theme(collection_name),
            }
        else:
            active_field_keys = {str(field.get("key")) for field in active_fields(type_doc)}
            if not active_field_keys:
                active_field_keys = inferred_field_keys
            objects = [serialize_object(doc, active_field_keys=active_field_keys) for doc in docs]
            type_doc_for_response = {**type_doc, "collectionName": collection_name}
            if not isinstance(type_doc_for_response.get("fields"), list) or not type_doc_for_response.get("fields"):
                type_doc_for_response["fields"] = inferred_fields

        return {
            "type": serialize_type(
                type_doc_for_response,
                object_count=len(objects),
                mongo_db_name=self._repo.mongo_db_name,
                read_only=read_only,
            ),
            "objects": objects,
        }

    def create_object(self, team: str, type_key: str, payload: CatalogObjectUpsertPayload) -> dict[str, Any]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        _type_collection, type_doc = self._type_or_404(db=db, team=safe_team, type_key=type_key)
        collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)
        objects_collection = self._repo.objects_collection(db, collection_name)

        name = str(payload.name or "").strip()
        url = str(payload.url or "").strip()

        visibility_teams = normalize_object_teams(
            payload.teams,
            current_team=safe_team,
            resolve_team_name=self._resolve_team_name,
        )
        field_values = normalize_object_values(payload.values, type_doc=type_doc)
        document = {
            "teams": visibility_teams,
        }
        if self._type_has_field(type_doc, "name") or name:
            document["name"] = name
        if self._type_has_field(type_doc, "url") or url:
            document["url"] = url
        document.update(field_values)

        try:
            insert_result = objects_collection.insert_one(document)
            created_doc = objects_collection.find_one({"_id": insert_result.inserted_id})
        except DuplicateKeyError as error:
            raise HTTPException(status_code=409, detail=f"Object '{name}' already exists in this catalog type.") from error
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to create catalog object in MongoDB.") from error

        if not created_doc:
            raise HTTPException(status_code=500, detail="Catalog object creation succeeded but reloading failed.")

        active_field_keys = {str(field.get("key")) for field in active_fields(type_doc)}
        return serialize_object(created_doc, active_field_keys=active_field_keys)

    def update_object(self, team: str, type_key: str, object_id: str, payload: CatalogObjectUpsertPayload) -> dict[str, Any]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        _type_collection, type_doc = self._type_or_404(db=db, team=safe_team, type_key=type_key)
        collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)
        objects_collection = self._repo.objects_collection(db, collection_name)

        mongo_id = parse_object_id(object_id)
        existing_doc = objects_collection.find_one({"_id": mongo_id})
        if not existing_doc:
            raise HTTPException(status_code=404, detail=f"Catalog object '{object_id}' not found.")

        name = str(payload.name or "").strip()
        url = str(payload.url or "").strip()

        visibility_teams = normalize_object_teams(
            payload.teams if payload.teams is not None else existing_doc.get("teams"),
            current_team=safe_team,
            resolve_team_name=self._resolve_team_name,
        )
        field_values = normalize_object_values(payload.values, type_doc=type_doc)
        update_fields = {
            "teams": visibility_teams,
            **field_values,
        }
        unset_fields: dict[str, str] = {}
        if self._type_has_field(type_doc, "name") or name:
            update_fields["name"] = name
        else:
            unset_fields["name"] = ""
        if self._type_has_field(type_doc, "url") or url:
            update_fields["url"] = url
        else:
            unset_fields["url"] = ""

        try:
            objects_collection.update_one(
                {"_id": mongo_id},
                {
                    "$set": update_fields,
                    **({"$unset": unset_fields} if unset_fields else {}),
                },
            )
            updated_doc = objects_collection.find_one({"_id": mongo_id})
        except DuplicateKeyError as error:
            raise HTTPException(status_code=409, detail=f"Object '{name}' already exists in this catalog type.") from error
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to update catalog object in MongoDB.") from error

        if not updated_doc:
            raise HTTPException(status_code=500, detail="Catalog object update succeeded but reloading failed.")

        active_field_keys = {str(field.get("key")) for field in active_fields(type_doc)}
        return serialize_object(updated_doc, active_field_keys=active_field_keys)

    def delete_object(self, team: str, type_key: str, object_id: str) -> dict[str, bool]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        _type_collection, type_doc = self._type_or_404(db=db, team=safe_team, type_key=type_key)
        collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)
        objects_collection = self._repo.objects_collection(db, collection_name)

        mongo_id = parse_object_id(object_id)
        try:
            delete_result = objects_collection.delete_one({"_id": mongo_id})
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to delete catalog object from MongoDB.") from error

        if delete_result.deleted_count <= 0:
            raise HTTPException(status_code=404, detail=f"Catalog object '{object_id}' not found.")

        return {"ok": True}

    @staticmethod
    def _field_label_from_key(key: str) -> str:
        safe_key = str(key or "").strip()
        if not safe_key:
            return "Field"
        normalized = safe_key.replace("_", " ").replace("-", " ").strip()
        return " ".join(part.capitalize() for part in normalized.split()) or safe_key

    @staticmethod
    def _field_type_for_value(value: Any) -> str:
        if value is None:
            return "string"
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, (int, float)):
            return "number"
        if isinstance(value, list):
            return "array"
        if isinstance(value, dict):
            return "dict"
        return "string"

    def _infer_fields_from_docs(
        self,
        docs: list[dict[str, Any]],
        *,
        prefer_values_field: bool = False,
    ) -> list[dict[str, Any]]:
        field_map: dict[str, str] = {}
        key_order: list[str] = []
        ignored_keys = {"_id", "name", "nameKey", "url", "team", "teams", "createdAt", "updatedAt", "values"}

        for doc in docs:
            if not isinstance(doc, dict):
                continue
            source_fields = doc
            if prefer_values_field and isinstance(doc.get("values"), dict):
                source_fields = {
                    **doc.get("values", {}),
                    **{
                        key: value
                        for key, value in doc.items()
                        if key != "values"
                    },
                }

            for raw_key, value in source_fields.items():
                key = str(raw_key or "").strip()
                if not key or key in ignored_keys:
                    continue
                if key not in field_map:
                    key_order.append(key)
                    field_map[key] = self._field_type_for_value(value)
                    continue

                if field_map[key] != "string":
                    next_type = self._field_type_for_value(value)
                    if next_type != field_map[key]:
                        field_map[key] = "string"

        return [
            {
                "key": key,
                "label": self._field_label_from_key(key),
                "type": field_map[key],
                "active": True,
                "order": index + 1,
            }
            for index, key in enumerate(key_order)
        ]

    @staticmethod
    def _doc_has_url(doc: dict[str, Any]) -> bool:
        return bool(str(doc.get("url") or "").strip())

    @staticmethod
    def _doc_visible_for_team(doc: dict[str, Any], team: str) -> bool:
        safe_team = str(team or "").strip().lower()
        if not safe_team:
            return True

        raw_team = str(doc.get("team") or "").strip()
        if raw_team and raw_team.lower() == safe_team:
            return True

        teams = doc.get("teams")
        if isinstance(teams, list):
            normalized_teams = [str(item or "").strip().lower() for item in teams if str(item or "").strip()]
            if not normalized_teams:
                return True
            return safe_team in normalized_teams

        if not raw_team and teams is None:
            return True
        return False

    def _list_visible_url_docs(self, collection, team: str) -> list[dict[str, Any]]:
        candidates = list(collection.find({"url": {"$exists": True}}))
        return [
            doc
            for doc in candidates
            if isinstance(doc, dict)
            and self._doc_has_url(doc)
            and self._doc_visible_for_team(doc, team)
        ]

    @staticmethod
    def _collection_names_excluding_meta(db: Database) -> list[str]:
        collection_names = []
        for name in db.list_collection_names():
            safe_name = str(name or "").strip()
            if not safe_name or safe_name == TYPE_DEFINITIONS_COLLECTION:
                continue
            if safe_name.startswith("system."):
                continue
            collection_names.append(safe_name)
        return sorted(collection_names)

    def _find_type_doc(self, *, type_collection, team: str, lookup_value: str):
        safe_team = team
        return type_collection.find_one(
            {
                "$and": [
                    {
                        "$or": [
                            {"collectionName": lookup_value},
                            {"collectionName": slugify(lookup_value, field_name="collectionName")},
                            {"displayName": lookup_value},
                            {"typeKey": slugify(lookup_value, field_name="typeKey")},
                        ]
                    },
                    self._type_visibility_filter(safe_team),
                ]
            },
            sort=[("_id", DESCENDING)],
        )

    def _require_team(self, team: str) -> str:
        return require_team(
            team,
            resolve_team_name=self._resolve_team_name,
            allowed_teams=self._allowed_teams,
        )

    def _type_or_404(self, *, db: Database, team: str, type_key: str):
        safe_team = team
        lookup_value = str(type_key or "").strip()
        if not lookup_value:
            raise HTTPException(status_code=400, detail="collectionName is required.")
        type_collection = self._repo.type_collection(db)
        type_doc = self._find_type_doc(type_collection=type_collection, team=safe_team, lookup_value=lookup_value)
        if not type_doc:
            raise HTTPException(status_code=404, detail=f"Catalog collection '{lookup_value}' not found.")
        return type_collection, type_doc

    def _collection_name(self, *, team: str, type_key: str, type_doc: dict[str, Any]) -> str:
        return str(type_doc.get("collectionName") or self._repo.object_collection_name(team, type_key))

    @staticmethod
    def _type_has_field(type_doc: dict[str, Any], field_key: str) -> bool:
        safe_key = str(field_key or "").strip().lower()
        return any(
            str(field.get("key") or "").strip().lower() == safe_key
            for field in active_fields(type_doc)
        )

    @staticmethod
    def _normalize_color_theme(value: Any) -> dict[str, str] | None:
        if not isinstance(value, dict):
            return None
        accent = str(value.get("accent") or "").strip()
        accent_alt = str(value.get("accentAlt") or "").strip()
        if not accent or not accent_alt:
            return None
        return {"accent": accent, "accentAlt": accent_alt}

    @staticmethod
    def _random_color_theme() -> dict[str, str]:
        theme = secrets.choice(COLLECTION_COLOR_THEMES)
        return {"accent": theme["accent"], "accentAlt": theme["accentAlt"]}

    @staticmethod
    def _fallback_color_theme(seed: str) -> dict[str, str]:
        safe_seed = str(seed or "").strip().lower()
        if not safe_seed:
            return CatalogService._random_color_theme()
        digest = hashlib.sha256(safe_seed.encode("utf-8")).hexdigest()
        index = int(digest[:8], 16) % len(COLLECTION_COLOR_THEMES)
        theme = COLLECTION_COLOR_THEMES[index]
        return {"accent": theme["accent"], "accentAlt": theme["accentAlt"]}

    def _ensure_stored_color_theme(self, *, type_collection, type_doc: dict[str, Any]) -> dict[str, Any]:
        existing_theme = self._normalize_color_theme(type_doc.get("colorTheme"))
        if existing_theme:
            if type_doc.get("colorTheme") == existing_theme:
                return type_doc
            return {**type_doc, "colorTheme": existing_theme}

        next_theme = self._random_color_theme()
        if type_doc.get("_id") is not None:
            type_collection.update_one(
                {"_id": type_doc["_id"]},
                {"$set": {"colorTheme": next_theme}},
            )
        return {**type_doc, "colorTheme": next_theme}

    @staticmethod
    def _visibility_filter(team: str) -> dict[str, Any]:
        return {
            "$or": [
                {"teams": team},
                {"teams": {"$exists": False}},
                {"teams": {"$size": 0}},
            ]
        }

    @staticmethod
    def _type_visibility_filter(team: str) -> dict[str, Any]:
        return {
            "$or": [
                {"teams": team},
                {"teams": {"$exists": False}},
                {"teams": {"$size": 0}},
            ]
        }

    @classmethod
    def _project_root(cls) -> Path:
        return Path(__file__).resolve().parents[2]

    @classmethod
    def _read_env_file_value(cls, key: str) -> str:
        safe_key = str(key or "").strip()
        if not safe_key:
            return ""

        env_path = cls._project_root() / ".env"
        if not env_path.is_file():
            return ""

        prefix = f"{safe_key}="
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or not stripped.startswith(prefix):
                    continue
                return stripped[len(prefix):].strip().strip('"').strip("'")
        except OSError:
            return ""

        return ""

    @classmethod
    def _resolve_mongo_uri(cls, explicit_uri: str | None) -> str:
        if explicit_uri is not None:
            return str(explicit_uri or "").strip()

        env_uri = str(os.getenv("MONGO_URI", "")).strip()
        if env_uri:
            return env_uri

        env_file_uri = cls._read_env_file_value("MONGO_URI")
        if env_file_uri:
            return env_file_uri

        mongo_port = (
            str(os.getenv("MONGO_PORT", "")).strip()
            or cls._read_env_file_value("MONGO_PORT")
            or "27017"
        )
        return f"mongodb://localhost:{mongo_port}"
