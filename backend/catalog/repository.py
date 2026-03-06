from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import OperationFailure, PyMongoError, ServerSelectionTimeoutError

from .constants import (
    TYPE_DEFINITIONS_COLLECTION,
)
from .validators import normalize_collection_name, slugify


class CatalogRepository:
    def __init__(self, *, mongo_uri: str, mongo_db_name: str) -> None:
        self._mongo_uri = str(mongo_uri or "").strip()
        self._mongo_db_name = str(mongo_db_name or "").strip()
        self._mongo_client: MongoClient | None = None
        self._type_collection_prepared = False

    def db(self) -> Database:
        return self._mongo_client_or_503()[self._mongo_db_name]

    @property
    def mongo_db_name(self) -> str:
        return self._mongo_db_name

    def type_collection(self, db: Database) -> Collection:
        collection = db[TYPE_DEFINITIONS_COLLECTION]
        if not self._type_collection_prepared:
            self._prepare_shared_type_collection(collection)
            self._type_collection_prepared = True

        self._ensure_unique_index(collection, [("collectionName", ASCENDING)])
        return collection

    def objects_collection(self, db: Database, collection_name: str) -> Collection:
        collection = db[collection_name]
        self._ensure_unique_index(collection, [("nameKey", ASCENDING)])
        return collection

    def object_collection_name(self, team: str, type_key: str) -> str:
        _ = team
        return slugify(type_key)

    def _prepare_shared_type_collection(self, collection: Collection) -> None:
        indexes = collection.index_information()
        for index_name, spec in indexes.items():
            if index_name == "_id_":
                continue

            key_spec = spec.get("key", [])
            if key_spec == [("team", 1), ("typeKey", 1)]:
                collection.drop_index(index_name)
                continue
            if key_spec == [("typeKey", 1)]:
                collection.drop_index(index_name)
                continue

        docs = list(collection.find({}).sort([("collectionName", ASCENDING), ("updatedAt", DESCENDING)]))
        kept_by_collection: dict[str, Any] = {}
        ids_to_delete: list[Any] = []
        for doc in docs:
            collection_name = self._derive_collection_name(doc)
            if not collection_name:
                ids_to_delete.append(doc.get("_id"))
                continue

            if collection_name in kept_by_collection:
                ids_to_delete.append(doc.get("_id"))
                continue

            kept_by_collection[collection_name] = doc.get("_id")
            legacy_collection = str(doc.get("collectionName") or "").strip()
            legacy_team = str(doc.get("team") or "").strip()
            existing_teams = doc.get("teams")
            normalized_teams: list[str] | None = None
            if isinstance(existing_teams, list):
                cleaned = [str(team or "").strip() for team in existing_teams if str(team or "").strip()]
                if cleaned:
                    normalized_teams = cleaned
            elif legacy_team and legacy_team != "SHARED":
                normalized_teams = [legacy_team]

            fields = doc.get("fields")
            normalized_fields = fields if isinstance(fields, list) else []

            update_payload = {
                "collectionName": collection_name,
                "fields": normalized_fields,
            }
            if normalized_teams is not None:
                update_payload["teams"] = normalized_teams

            collection.update_one(
                {"_id": doc.get("_id")},
                {
                    "$set": update_payload,
                    "$unset": {
                        "team": "",
                        "typeKey": "",
                        "displayName": "",
                        "createdAt": "",
                        "updatedAt": "",
                    },
                },
            )

        clean_ids_to_delete = [item for item in ids_to_delete if item is not None]
        if clean_ids_to_delete:
            collection.delete_many({"_id": {"$in": clean_ids_to_delete}})

    @staticmethod
    def _derive_collection_name(doc: dict[str, Any]) -> str:
        candidates = [
            str(doc.get("collectionName") or "").strip(),
            str(doc.get("displayName") or "").strip(),
            str(doc.get("typeKey") or "").strip(),
        ]
        for candidate in candidates:
            if not candidate:
                continue
            try:
                return normalize_collection_name(candidate)
            except HTTPException:
                return slugify(candidate, field_name="collectionName")
        return ""

    def _merge_objects_collection(self, db: Database, *, source_name: str, target_name: str) -> None:
        if source_name == target_name:
            return

        source = db[source_name]
        target = db[target_name]
        self._ensure_unique_index(target, [("nameKey", ASCENDING)])

        for doc in source.find({}):
            payload = dict(doc)
            payload.pop("_id", None)

            name_key = str(payload.get("nameKey") or "").strip()
            if not name_key:
                fallback_name = str(payload.get("name") or "").strip()
                if not fallback_name:
                    continue
                name_key = slugify(fallback_name, field_name="name")
                payload["nameKey"] = name_key

            target.update_one(
                {"nameKey": name_key},
                {"$setOnInsert": payload},
                upsert=True,
            )

        db.drop_collection(source_name)

    @staticmethod
    def backfill_new_fields(objects_collection: Collection, field_keys: list[str]) -> None:
        for key in field_keys:
            objects_collection.update_many(
                {f"values.{key}": {"$exists": False}},
                {"$set": {f"values.{key}": None}},
            )

    @staticmethod
    def drop_collection(db: Database, collection_name: str) -> None:
        db.drop_collection(collection_name)

    @staticmethod
    def rename_collection(db: Database, source_name: str, target_name: str) -> None:
        if source_name == target_name:
            return
        if source_name not in db.list_collection_names():
            return
        try:
            db[source_name].rename(target_name, dropTarget=False)
        except OperationFailure as error:
            raise HTTPException(status_code=409, detail=f"Collection '{target_name}' already exists.") from error

    @staticmethod
    def _ensure_unique_index(collection: Collection, keys: list[tuple[str, int]]) -> None:
        indexes = collection.index_information()
        for index_name, spec in indexes.items():
            if spec.get("key", []) != keys:
                continue

            if bool(spec.get("unique")):
                return

            # Same key pattern exists but not unique; replace it.
            collection.drop_index(index_name)
            break

        collection.create_index(keys, unique=True)

    def _mongo_client_or_503(self) -> MongoClient:
        if self._mongo_client is not None:
            return self._mongo_client

        if not self._mongo_uri:
            raise HTTPException(status_code=500, detail="MONGO_URI is not configured.")

        try:
            self._mongo_client = MongoClient(self._mongo_uri, serverSelectionTimeoutMS=4500)
            self._mongo_client.admin.command("ping")
        except ServerSelectionTimeoutError as error:
            raise HTTPException(status_code=503, detail="Failed to connect to MongoDB (timeout).") from error
        except PyMongoError as error:
            raise HTTPException(status_code=503, detail="Failed to connect to MongoDB.") from error

        return self._mongo_client
