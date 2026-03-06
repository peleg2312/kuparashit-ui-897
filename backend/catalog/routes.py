from __future__ import annotations

from typing import Callable

from fastapi import FastAPI

from .schemas import CatalogObjectUpsertPayload, CatalogTypeCreatePayload, CatalogTypeUpdatePayload
from .service import CatalogService


def register_catalog_routes(
    app: FastAPI,
    *,
    resolve_team_name: Callable[[str], str | None],
    allowed_teams: set[str] | None = None,
    mongo_uri: str | None = None,
    mongo_db_name: str | None = None,
) -> CatalogService:
    service = CatalogService(
        resolve_team_name=resolve_team_name,
        allowed_teams=allowed_teams,
        mongo_uri=mongo_uri,
        mongo_db_name=mongo_db_name,
    )

    @app.get("/catalog/types")
    def catalog_list_types(team: str):
        return service.list_types(team)

    @app.post("/catalog/types")
    def catalog_create_type(payload: CatalogTypeCreatePayload, team: str):
        return service.create_type(team, payload)

    @app.put("/catalog/types/{type_key}")
    def catalog_update_type(type_key: str, payload: CatalogTypeUpdatePayload, team: str):
        return service.update_type(team, type_key, payload)

    @app.delete("/catalog/types/{type_key}")
    def catalog_delete_type(type_key: str, team: str):
        return service.delete_type(team, type_key)

    @app.get("/catalog/types/{type_key}/objects")
    def catalog_list_objects(type_key: str, team: str):
        return service.list_objects(team, type_key)

    @app.post("/catalog/types/{type_key}/objects")
    def catalog_create_object(type_key: str, payload: CatalogObjectUpsertPayload, team: str):
        return service.create_object(team, type_key, payload)

    @app.put("/catalog/types/{type_key}/objects/{object_id}")
    def catalog_update_object(type_key: str, object_id: str, payload: CatalogObjectUpsertPayload, team: str):
        return service.update_object(team, type_key, object_id, payload)

    @app.delete("/catalog/types/{type_key}/objects/{object_id}")
    def catalog_delete_object(type_key: str, object_id: str, team: str):
        return service.delete_object(team, type_key, object_id)

    return service

