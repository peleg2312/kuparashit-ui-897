from __future__ import annotations

import os
from typing import Any, Callable

from fastapi import HTTPException
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

from .constants import DEFAULT_FIELD_TYPES, DEFAULT_MONGO_DB_NAME
from .repository import CatalogRepository
from .schemas import CatalogObjectUpsertPayload, CatalogTypeCreatePayload, CatalogTypeUpdatePayload
from .serializers import serialize_object, serialize_type
from .validators import (
    active_fields,
    merge_fields,
    name_key,
    normalize_collection_name,
    normalize_fields,
    normalize_object_values,
    normalize_object_teams,
    normalize_visibility_teams,
    now_iso,
    parse_object_id,
    require_team,
    slugify,
)


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

        resolved_mongo_uri = str(mongo_uri if mongo_uri is not None else os.getenv("MONGO_URI", "")).strip()
        resolved_db_name = str(
            mongo_db_name if mongo_db_name is not None else os.getenv("MONGO_DB_NAME", DEFAULT_MONGO_DB_NAME)
        ).strip() or DEFAULT_MONGO_DB_NAME
        self._repo = CatalogRepository(mongo_uri=resolved_mongo_uri, mongo_db_name=resolved_db_name)

    def list_types(self, team: str) -> dict[str, Any]:
        safe_team = self._require_team(team)
        db = self._repo.db()
        type_collection = self._repo.type_collection(db)

        try:
            type_docs = list(type_collection.find(self._type_visibility_filter(safe_team)).sort("collectionName", ASCENDING))
            results: list[dict[str, Any]] = []
            for type_doc in type_docs:
                collection_name = self._collection_name(team=safe_team, type_key="", type_doc=type_doc)
                objects_collection = self._repo.objects_collection(db, collection_name)
                object_count = objects_collection.count_documents(self._visibility_filter(safe_team))
                type_doc_for_response = {**type_doc, "collectionName": collection_name}
                results.append(
                    serialize_type(
                        type_doc_for_response,
                        object_count=object_count,
                        mongo_db_name=self._repo.mongo_db_name,
                    )
                )
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to load catalog types from MongoDB.") from error

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
        _type_collection, type_doc = self._type_or_404(db=db, team=safe_team, type_key=type_key)
        collection_name = self._collection_name(team=safe_team, type_key=type_key, type_doc=type_doc)
        objects_collection = self._repo.objects_collection(db, collection_name)
        active_field_keys = {str(field.get("key")) for field in active_fields(type_doc)}

        try:
            docs = list(objects_collection.find(self._visibility_filter(safe_team)).sort("nameKey", ASCENDING))
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to load catalog objects from MongoDB.") from error

        objects = [serialize_object(doc, active_field_keys=active_field_keys) for doc in docs]
        type_doc_for_response = {**type_doc, "collectionName": collection_name}
        return {
            "type": serialize_type(
                type_doc_for_response,
                object_count=len(objects),
                mongo_db_name=self._repo.mongo_db_name,
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
        if not name:
            raise HTTPException(status_code=400, detail="name is required.")

        timestamp = now_iso()
        visibility_teams = normalize_object_teams(
            payload.teams,
            current_team=safe_team,
            resolve_team_name=self._resolve_team_name,
        )
        document = {
            "name": name,
            "nameKey": name_key(name),
            "url": str(payload.url or "").strip(),
            "values": normalize_object_values(payload.values, type_doc=type_doc),
            "teams": visibility_teams,
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

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
        if not name:
            raise HTTPException(status_code=400, detail="name is required.")

        visibility_teams = normalize_object_teams(
            payload.teams if payload.teams is not None else existing_doc.get("teams"),
            current_team=safe_team,
            resolve_team_name=self._resolve_team_name,
        )

        try:
            objects_collection.update_one(
                {"_id": mongo_id},
                {
                    "$set": {
                        "name": name,
                        "nameKey": name_key(name),
                        "url": str(payload.url or "").strip(),
                        "values": normalize_object_values(payload.values, type_doc=type_doc),
                        "teams": visibility_teams,
                        "updatedAt": now_iso(),
                    }
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
        type_doc = type_collection.find_one(
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
        if not type_doc:
            raise HTTPException(status_code=404, detail=f"Catalog collection '{lookup_value}' not found.")
        return type_collection, type_doc

    def _collection_name(self, *, team: str, type_key: str, type_doc: dict[str, Any]) -> str:
        return str(type_doc.get("collectionName") or self._repo.object_collection_name(team, type_key))

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
