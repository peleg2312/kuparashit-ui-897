# Script Actions — MongoDB Backend Implementation Guide

This guide walks you through implementing the **Script Actions** backend on your real internal-network server using **MongoDB** for persistent storage. It replaces the in-memory `SCRIPTS_DB` dict used in the demo `backend/app.py`.

The frontend (Kuparashit UI at `/scripts/actions`) is already finished and will not change. It calls exactly 4 endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/scripts` | List all scripts |
| `POST` | `/scripts` | Create a new script |
| `PUT` | `/scripts/{script_id}` | Update (or rename) an existing script |
| `DELETE` | `/scripts/{script_id}` | Delete a script |

Your job is to implement these 4 endpoints backed by a MongoDB collection. The response shape **must** match exactly what's defined below or the UI will break.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [MongoDB collection design](#2-mongodb-collection-design)
3. [File structure](#3-file-structure)
4. [Code: constants.py](#4-code-constantspy)
5. [Code: validators.py](#5-code-validatorspy)
6. [Code: repository.py](#6-code-repositorypy)
7. [Code: serializers.py](#7-code-serializerspy)
8. [Code: service.py](#8-code-servicepy)
9. [Code: routes.py](#9-code-routespy)
10. [Wiring it into app.py](#10-wiring-it-into-apppy)
11. [Permissions](#11-permissions)
12. [Seeding initial data (optional)](#12-seeding-initial-data-optional)
13. [Testing the implementation](#13-testing-the-implementation)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

### 1.1 MongoDB running

You need a reachable MongoDB instance. If your real backend already has the **catalog** feature working, you're done — same Mongo, same DB (`kupa_rashit` by default).

If you're starting fresh:
- MongoDB 4.4+
- Database name: `kupa_rashit` (or override via `MONGO_DB_NAME` env var)
- Connection URI in `MONGO_URI` env var (e.g. `mongodb://mongo-host:27017`)

### 1.2 Python dependencies

```bash
pip install pymongo  # already installed if catalog works
```

### 1.3 Environment variables

```bash
export MONGO_URI="mongodb://your-mongo-host:27017"
export MONGO_DB_NAME="kupa_rashit"   # optional, this is the default
```

If `MONGO_URI` isn't set, the code falls back to `mongodb://localhost:27017` (same as catalog).

---

## 2. MongoDB collection design

**Database:** `kupa_rashit`
**Collection:** `scripts`

### Document shape

```json
{
  "_id": "create_portchannel",
  "label": "Create Port Channel",
  "description": "Create a new port channel on the switch",
  "url": "https://internal-api/switches/portchannel/create",
  "method": "POST",
  "fields_required": [
    {
      "name": "switch_name",
      "label": "Switch Name",
      "type": "dropdown-api",
      "url": "https://internal-api/mds/switch_names",
      "required": true
    },
    {
      "name": "port_channel_id",
      "label": "Port Channel ID",
      "type": "number",
      "min": 1,
      "max": 999,
      "required": true
    },
    { "name": "description", "label": "Description", "type": "text", "required": false }
  ],
  "createdAt": "2026-05-28T10:00:00Z",
  "updatedAt": "2026-05-28T10:00:00Z"
}
```

**Key design choices:**
- `_id` **is** the script slug (e.g. `"create_portchannel"`). MongoDB enforces uniqueness on `_id` automatically — no extra index needed.
- When serializing to the API, rename `_id` → `id` so the frontend receives `{"id": "...", ...}`.
- No `teams` field — scripts are shared across all users with the `script-actions` permission.
- `createdAt` / `updatedAt` are auditing-only; the frontend ignores them.

### Allowed values

- **`method`**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- **`fields_required[].type`**: `text`, `number`, `toggle`, `dropdown-api`
- **`dropdown-api`** fields MUST have a `url` property (always GET'd by the frontend)
- **`number`** fields MAY have optional `min` / `max` numeric bounds

### Indexes

Only one is needed and MongoDB creates it automatically:

```
{ _id: 1 }   // unique, auto-created
```

---

## 3. File structure

Create a new module `backend/scripts/` mirroring the existing `backend/catalog/` layering:

```
backend/scripts/
├── __init__.py
├── constants.py       # Allowed methods, field types, defaults
├── validators.py      # Payload normalization + 400 errors
├── repository.py      # MongoDB collection access (lazy connection)
├── serializers.py     # doc → API shape (_id → id)
├── service.py         # Business logic + 404/409 mapping
└── routes.py          # FastAPI route registration
```

Create the empty package file:

```bash
mkdir -p backend/scripts
touch backend/scripts/__init__.py
```

The next sections give you the complete contents for each file.

---

## 4. Code: `constants.py`

```python
# backend/scripts/constants.py

SCRIPTS_COLLECTION = "scripts"

DEFAULT_DB_NAME = "kupa_rashit"
DEFAULT_MONGO_PORT = 27017
CONNECTION_TIMEOUT_MS = 4500

ALLOWED_METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})
ALLOWED_FIELD_TYPES = frozenset({"text", "number", "toggle", "dropdown-api"})
```

---

## 5. Code: `validators.py`

This is the heart of input validation. Every error returns HTTP 400 with a human-readable detail.

```python
# backend/scripts/validators.py

import re
from typing import Any
from fastapi import HTTPException

from .constants import ALLOWED_METHODS, ALLOWED_FIELD_TYPES

SLUG_RE = re.compile(r"^[a-z0-9_]+$")
URL_RE = re.compile(r"^https?://\S+", re.IGNORECASE)


def slugify_id(value: Any) -> str:
    """Lowercase, replace non-alphanumeric runs with _, trim leading/trailing _."""
    cleaned = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower())
    return re.sub(r"^_+|_+$", "", cleaned)


def _normalize_field(raw_field: Any, index: int) -> dict[str, Any]:
    if not isinstance(raw_field, dict):
        raise HTTPException(400, f"Field at index {index} must be an object.")

    name = str(raw_field.get("name") or "").strip()
    if not name:
        raise HTTPException(400, f"Field at index {index} is missing 'name'.")

    label = str(raw_field.get("label") or name).strip()
    field_type = str(raw_field.get("type") or "text").strip()
    if field_type not in ALLOWED_FIELD_TYPES:
        raise HTTPException(
            400, f"Unsupported field type '{field_type}' on '{name}'. "
                 f"Allowed: {sorted(ALLOWED_FIELD_TYPES)}"
        )

    entry: dict[str, Any] = {
        "name": name,
        "label": label,
        "type": field_type,
        "required": bool(raw_field.get("required", False)),
    }

    if field_type == "dropdown-api":
        field_url = str(raw_field.get("url") or "").strip()
        if not field_url:
            raise HTTPException(400, f"Field '{name}' (dropdown-api) requires a 'url'.")
        if not URL_RE.match(field_url):
            raise HTTPException(
                400, f"Field '{name}' url must start with http:// or https://"
            )
        entry["url"] = field_url

    if field_type == "number":
        for bound_key in ("min", "max"):
            raw_value = raw_field.get(bound_key)
            if raw_value not in (None, ""):
                try:
                    entry[bound_key] = float(raw_value)
                except (TypeError, ValueError):
                    raise HTTPException(
                        400, f"Field '{name}' has invalid '{bound_key}': {raw_value!r}"
                    )

    return entry


def normalize_script_payload(
    payload: Any,
    default_id: str | None = None,
) -> dict[str, Any]:
    """
    Validate and normalize a script payload (from POST/PUT body).

    Returns a dict ready to insert into MongoDB (with `_id` set).
    Raises HTTPException(400) on any validation failure.
    """
    if not isinstance(payload, dict):
        raise HTTPException(400, "Payload must be a JSON object.")

    raw_id = str(payload.get("id") or default_id or "").strip()
    slug = slugify_id(raw_id)
    if not slug:
        raise HTTPException(400, "Script id is required.")
    if not SLUG_RE.match(slug):
        raise HTTPException(
            400, "Script id must contain only lowercase letters, digits, and underscores."
        )

    label = str(payload.get("label") or "").strip()
    if not label:
        raise HTTPException(400, "Script label is required.")

    url = str(payload.get("url") or "").strip()
    if not url:
        raise HTTPException(400, "Script url is required.")
    if not URL_RE.match(url):
        raise HTTPException(400, "Script url must start with http:// or https://")

    method = str(payload.get("method") or "POST").strip().upper()
    if method not in ALLOWED_METHODS:
        raise HTTPException(
            400, f"Unsupported method '{method}'. Allowed: {sorted(ALLOWED_METHODS)}"
        )

    description = str(payload.get("description") or "").strip()

    raw_fields = payload.get("fields_required") or []
    if not isinstance(raw_fields, list):
        raise HTTPException(400, "fields_required must be a list.")

    fields: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for index, raw_field in enumerate(raw_fields):
        normalized = _normalize_field(raw_field, index)
        if normalized["name"] in seen_names:
            raise HTTPException(400, f"Duplicate field name '{normalized['name']}'.")
        seen_names.add(normalized["name"])
        fields.append(normalized)

    return {
        "_id": slug,
        "label": label,
        "description": description,
        "url": url,
        "method": method,
        "fields_required": fields,
    }
```

---

## 6. Code: `repository.py`

The repository wraps MongoDB access. Connection is lazy (only created on first use) and shared across instances via a class-level singleton.

```python
# backend/scripts/repository.py

import os
from typing import Any
from pymongo import MongoClient
from pymongo.collection import Collection

from .constants import (
    SCRIPTS_COLLECTION,
    DEFAULT_DB_NAME,
    DEFAULT_MONGO_PORT,
    CONNECTION_TIMEOUT_MS,
)


def _resolve_mongo_uri() -> str:
    """Resolution order: MONGO_URI env > fallback localhost."""
    uri = os.getenv("MONGO_URI", "").strip()
    if uri:
        return uri
    port = os.getenv("MONGO_PORT", str(DEFAULT_MONGO_PORT)).strip()
    return f"mongodb://localhost:{port}"


def _resolve_db_name() -> str:
    return os.getenv("MONGO_DB_NAME", "").strip() or DEFAULT_DB_NAME


class ScriptsRepository:
    """
    Thin wrapper over the `scripts` MongoDB collection.
    Class-level _client gives a single shared MongoClient across the process.
    """
    _client: MongoClient | None = None

    def __init__(
        self,
        mongo_uri: str | None = None,
        db_name: str | None = None,
    ):
        self._uri = (mongo_uri or _resolve_mongo_uri()).strip()
        self._db_name = (db_name or _resolve_db_name()).strip() or DEFAULT_DB_NAME

    def _client_instance(self) -> MongoClient:
        if ScriptsRepository._client is None:
            ScriptsRepository._client = MongoClient(
                self._uri,
                serverSelectionTimeoutMS=CONNECTION_TIMEOUT_MS,
            )
        return ScriptsRepository._client

    @property
    def collection(self) -> Collection:
        return self._client_instance()[self._db_name][SCRIPTS_COLLECTION]

    # ---- CRUD ----

    def list_all(self) -> list[dict[str, Any]]:
        return list(self.collection.find({}))

    def get(self, script_id: str) -> dict[str, Any] | None:
        return self.collection.find_one({"_id": script_id})

    def insert(self, doc: dict[str, Any]) -> None:
        self.collection.insert_one(doc)

    def replace(self, script_id: str, doc: dict[str, Any]) -> int:
        result = self.collection.replace_one({"_id": script_id}, doc, upsert=False)
        return result.matched_count

    def delete(self, script_id: str) -> int:
        result = self.collection.delete_one({"_id": script_id})
        return result.deleted_count
```

> **If your catalog already exposes a shared `MongoClient`**, prefer importing that instead of creating a new one in this class. Both modules sharing one client is cleaner. Example:
>
> ```python
> from catalog.repository import get_mongo_client  # if exposed
> self._client = get_mongo_client()
> ```

---

## 7. Code: `serializers.py`

```python
# backend/scripts/serializers.py

from typing import Any


def serialize_script(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Rename Mongo's `_id` to the API's `id`. The UI expects `id`."""
    if not doc:
        return None
    out = dict(doc)
    if "_id" in out:
        out["id"] = out.pop("_id")
    return out
```

---

## 8. Code: `service.py`

The service layer enforces business rules: not-found → 404, duplicates → 409, and orchestrates the rename flow.

```python
# backend/scripts/service.py

from datetime import datetime, timezone
from typing import Any
from fastapi import HTTPException

from .repository import ScriptsRepository
from .serializers import serialize_script
from .validators import normalize_script_payload


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ScriptsService:
    def __init__(self, repo: ScriptsRepository | None = None):
        self.repo = repo or ScriptsRepository()

    def list_scripts(self) -> list[dict[str, Any]]:
        return [serialize_script(doc) for doc in self.repo.list_all()]

    def create_script(self, payload: Any) -> dict[str, Any]:
        doc = normalize_script_payload(payload)
        if self.repo.get(doc["_id"]):
            raise HTTPException(409, f"Script '{doc['_id']}' already exists.")
        now = _now_iso()
        doc["createdAt"] = now
        doc["updatedAt"] = now
        self.repo.insert(doc)
        return serialize_script(doc)

    def update_script(self, script_id: str, payload: Any) -> dict[str, Any]:
        existing = self.repo.get(script_id)
        if not existing:
            raise HTTPException(404, f"Script '{script_id}' not found.")

        doc = normalize_script_payload(payload, default_id=script_id)

        # Rename flow
        if doc["_id"] != script_id:
            if self.repo.get(doc["_id"]):
                raise HTTPException(409, f"Script '{doc['_id']}' already exists.")
            # Delete old, insert new (so the _id changes)
            self.repo.delete(script_id)
            doc["createdAt"] = existing.get("createdAt", _now_iso())
            doc["updatedAt"] = _now_iso()
            self.repo.insert(doc)
            return serialize_script(doc)

        # Regular update (same _id)
        doc["createdAt"] = existing.get("createdAt", _now_iso())
        doc["updatedAt"] = _now_iso()
        self.repo.replace(script_id, doc)
        return serialize_script(doc)

    def delete_script(self, script_id: str) -> dict[str, Any]:
        deleted = self.repo.delete(script_id)
        if not deleted:
            raise HTTPException(404, f"Script '{script_id}' not found.")
        return {"ok": True, "id": script_id}
```

---

## 9. Code: `routes.py`

```python
# backend/scripts/routes.py

from typing import Any
from fastapi import FastAPI

from .service import ScriptsService


def register_scripts_routes(
    app: FastAPI,
    service: ScriptsService | None = None,
) -> ScriptsService:
    """Register the 4 /scripts routes on the given FastAPI app."""
    svc = service or ScriptsService()

    @app.get("/scripts")
    def list_scripts() -> list[dict[str, Any]]:
        return svc.list_scripts()

    @app.post("/scripts")
    def create_script(payload: dict[str, Any]) -> dict[str, Any]:
        return svc.create_script(payload)

    @app.put("/scripts/{script_id}")
    def update_script(script_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return svc.update_script(script_id, payload)

    @app.delete("/scripts/{script_id}")
    def delete_script(script_id: str) -> dict[str, Any]:
        return svc.delete_script(script_id)

    return svc
```

---

## 10. Wiring it into `app.py`

Open your real backend's `backend/app.py` and add the registration near where you call `register_catalog_routes` (or after `app = FastAPI(...)` if you don't have catalog):

```python
# backend/app.py

from scripts.routes import register_scripts_routes

# ... your existing app setup ...

scripts_service = register_scripts_routes(app)
```

**Important — route ordering:** if your `app.py` has a catch-all route like `@app.post("/{path:path}")` or `@app.put("/{path:path}")`, make sure `register_scripts_routes(app)` is called **before** those catch-alls are registered. FastAPI matches routes in registration order — first match wins. (In the demo `app.py`, the `/scripts` routes are defined right before the `/{path:path}` catch-alls for this reason.)

---

## 11. Permissions

The UI shows the **Script Actions** page only to users whose team has the `script-actions` permission. On the real backend, find your `TEAM_PERMISSIONS` (or equivalent) dict and add `"script-actions"` to the teams that should have access. In the demo it's done like this:

```python
TEAM_PERMISSIONS = {
    "BLOCK": ["rdm", "ds", "esx", ..., "script-actions"],   # ← add here
    "NASA":  ["qtree", "ds", "dashy"],
    ...
}
```

If your real backend uses a different permission system (RBAC tables, OPA, etc.), add `script-actions` as a new permission key wherever screen-level permissions live.

The 4 `/scripts` endpoints themselves are protected by your existing auth middleware (logged-in users only). They do **not** filter by team — anyone with the `script-actions` UI permission sees all scripts. This was an explicit design choice; if you ever want per-script visibility, add a `teams: []` array to each document and filter in `ScriptsService.list_scripts()`.

---

## 12. Seeding initial data (optional)

If you want to start with the same 4 example scripts from the demo, run this **once** after deploying the new module:

```python
# backend/scripts/seed.py

from .repository import ScriptsRepository
from .validators import normalize_script_payload

SEED = [
    {
        "id": "create_portchannel",
        "label": "Create Port Channel",
        "description": "Create a new port channel on the switch",
        "url": "https://internal-api/switches/portchannel/create",
        "method": "POST",
        "fields_required": [
            {"name": "switch_name", "label": "Switch Name", "type": "dropdown-api",
             "url": "https://internal-api/mds/switch_names", "required": True},
            {"name": "port_channel_id", "label": "Port Channel ID", "type": "number",
             "min": 1, "max": 999, "required": True},
            {"name": "description", "label": "Description", "type": "text", "required": False},
        ],
    },
    {
        "id": "change_bb_credits",
        "label": "Change BB Credits",
        "description": "Modify BB credits on an MDS port",
        "url": "https://internal-api/zoner/modifyBbcredits",
        "method": "POST",
        "fields_required": [
            {"name": "switch_name", "label": "Switch Name", "type": "dropdown-api",
             "url": "https://internal-api/mds/switch_names", "required": True},
            {"name": "port_name", "label": "Port Name", "type": "text", "required": True},
            {"name": "bbcredits", "label": "BB Credits", "type": "number", "min": 1, "required": True},
        ],
    },
    # Add more if you want — or skip seeding and let users add scripts through the UI.
]


def seed():
    repo = ScriptsRepository()
    for entry in SEED:
        doc = normalize_script_payload(entry)
        repo.collection.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        print(f"  upserted: {doc['_id']}")
    print(f"Seeded {len(SEED)} scripts.")


if __name__ == "__main__":
    seed()
```

Run with:

```bash
cd backend && python -m scripts.seed
```

You can re-run this safely — `upsert=True` means it overwrites by `_id` without erroring.

**Alternative:** skip seeding. Users will see an empty grid that says *"No scripts yet. Click 'Add Script' to create one."* — and they can build their library through the UI.

---

## 13. Testing the implementation

### 13.1 MongoDB sanity

```bash
mongosh "$MONGO_URI"
> use kupa_rashit
> db.scripts.countDocuments()    # 0 if you didn't seed
> db.scripts.find().pretty()
```

### 13.2 curl smoke test

Replace `$BASE` with your backend's base URL (e.g. `http://your-internal-host:8000`).

```bash
# 1. List (should be [] or your seeded data)
curl -s -b cookies.txt $BASE/scripts | jq

# 2. Create
curl -s -b cookies.txt -X POST $BASE/scripts \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "test_script",
    "label": "Test Script",
    "description": "Quick sanity test",
    "url": "https://example.com/api/test",
    "method": "POST",
    "fields_required": [
      {"name": "foo", "label": "Foo", "type": "text", "required": true}
    ]
  }' | jq

# 3. Duplicate create (should return 409)
curl -s -b cookies.txt -X POST $BASE/scripts \
  -H 'Content-Type: application/json' \
  -d '{"id":"test_script","label":"x","url":"https://x","method":"POST","fields_required":[]}' \
  -w "\nHTTP %{http_code}\n"

# 4. Update (rename)
curl -s -b cookies.txt -X PUT $BASE/scripts/test_script \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "test_script_renamed",
    "label": "Renamed",
    "url": "https://example.com/api/test",
    "method": "POST",
    "fields_required": []
  }' | jq

# 5. Update non-existent (should return 404)
curl -s -b cookies.txt -X PUT $BASE/scripts/nope \
  -H 'Content-Type: application/json' \
  -d '{"id":"nope","label":"x","url":"https://x","method":"POST","fields_required":[]}' \
  -w "\nHTTP %{http_code}\n"

# 6. Bad URL (should return 400)
curl -s -b cookies.txt -X POST $BASE/scripts \
  -H 'Content-Type: application/json' \
  -d '{"id":"bad","label":"x","url":"ftp://x","method":"POST","fields_required":[]}' \
  -w "\nHTTP %{http_code}\n"

# 7. dropdown-api missing url (should return 400)
curl -s -b cookies.txt -X POST $BASE/scripts \
  -H 'Content-Type: application/json' \
  -d '{
    "id":"bad2","label":"x","url":"https://x","method":"POST",
    "fields_required":[{"name":"f","label":"F","type":"dropdown-api"}]
  }' \
  -w "\nHTTP %{http_code}\n"

# 8. Delete
curl -s -b cookies.txt -X DELETE $BASE/scripts/test_script_renamed | jq

# 9. Delete non-existent (should return 404)
curl -s -b cookies.txt -X DELETE $BASE/scripts/nope -w "\nHTTP %{http_code}\n"
```

(If your auth is bearer-based, swap `-b cookies.txt` for `-H "Authorization: Bearer $TOKEN"`.)

### 13.3 Frontend e2e

1. Restart the real backend.
2. Open the UI → navigate to **`/scripts/actions`**.
3. The cubes you created via curl/seed should appear.
4. **Add Script** → fill the form → Save → cube appears.
5. **Edit** a cube → change something → Save → reload page → change persists.
6. **Run** a cube → modal opens → fill fields → Execute → the request goes directly to the script's `url` (not your backend). You should see a result popup with whatever that endpoint returns.
7. **Delete** a cube → confirm → cube disappears → check `db.scripts.find()` → it's gone.
8. **Persistence** → restart the backend → all data still there.

### 13.4 Automated tests (optional but recommended)

Mirror your catalog tests if you have them. A minimal pytest setup:

```python
# backend/scripts/tests/test_validators.py
import pytest
from fastapi import HTTPException
from scripts.validators import normalize_script_payload

def test_minimal_valid():
    doc = normalize_script_payload({
        "id": "x", "label": "X", "url": "https://x", "method": "POST", "fields_required": []
    })
    assert doc["_id"] == "x"

def test_missing_url():
    with pytest.raises(HTTPException) as ex:
        normalize_script_payload({"id":"x","label":"X","method":"POST","fields_required":[]})
    assert ex.value.status_code == 400

def test_dropdown_api_requires_url():
    with pytest.raises(HTTPException) as ex:
        normalize_script_payload({
            "id":"x","label":"X","url":"https://x","method":"POST",
            "fields_required":[{"name":"f","label":"F","type":"dropdown-api"}]
        })
    assert ex.value.status_code == 400

def test_duplicate_field_names():
    with pytest.raises(HTTPException) as ex:
        normalize_script_payload({
            "id":"x","label":"X","url":"https://x","method":"POST",
            "fields_required":[
                {"name":"a","label":"A","type":"text"},
                {"name":"a","label":"A2","type":"text"},
            ]
        })
    assert ex.value.status_code == 400
```

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ServerSelectionTimeoutError` | `MONGO_URI` wrong or Mongo not reachable | `mongosh "$MONGO_URI"` to verify |
| 401 on every `/scripts/*` call | Auth middleware blocking | Make sure the user is logged in; same auth as your other endpoints |
| Frontend shows cubes but executing fails with "Network Error" | Script `url` points at an unreachable host | Edit the cube via the pencil icon; set `url` to a reachable endpoint |
| Frontend shows cubes but executing fails with 401 | Script `url` is on your own backend but the rawClient strips auth for cross-origin requests | Either (a) make that script-target endpoint public, or (b) check the `pickClient` logic in `src/api/scripts.js` — it only attaches auth for URLs matching `API_CONFIG.mainBaseUrl` exactly |
| `400: Script id must contain only lowercase letters...` on UI save | User typed `My Script ID` | The UI's `slugify` should convert it client-side; backend `slugify_id` also normalizes — accept and re-display |
| Catalog still works, scripts return 404 on every endpoint | Route catch-all (`/{path:path}`) registered before scripts routes | Move `register_scripts_routes(app)` call earlier in `app.py` |
| Duplicate `_id` errors from Mongo on insert | Race between two creates | Service already returns 409 on `get()` before insert; if you see this from Mongo directly, you're not going through the service |
| Frontend shows old/cached scripts after edits | React Query stale cache | The page already calls `queryClient.invalidateQueries({queryKey:['scripts']})` after mutations — if you see staleness, check `react-query` devtools |

---

## Appendix: Quick reference — file checklist

```
backend/scripts/
├── __init__.py        ← empty
├── constants.py       ← §4
├── validators.py      ← §5
├── repository.py      ← §6
├── serializers.py     ← §7
├── service.py         ← §8
├── routes.py          ← §9
└── seed.py            ← §12 (optional)
```

Plus one line in `backend/app.py` (§10) and one entry in `TEAM_PERMISSIONS` (§11).

That's the whole thing. ~7 files, ~400 lines of Python total, no schema migrations needed.
