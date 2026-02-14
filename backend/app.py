from __future__ import annotations

import asyncio
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from pydantic import BaseModel

app = FastAPI(title="Kupa Rashit Demo API", version="2.0.0")

ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-prod")
JWT_ALG = "HS256"
ACCESS_TOKEN_TTL_MIN = int(os.getenv("ACCESS_TOKEN_TTL_MIN", "60"))
ACCESS_COOKIE_NAME = os.getenv("ACCESS_COOKIE_NAME", "access_token")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


USERS_DB: list[dict[str, Any]] = [
    {
        "id": "u1",
        "username": "admin",
        "name": "Admin User",
        "email": "admin@company.com",
        "role": "admin",
        "teams": ["BLOCK", "NASA"],
        "avatar": None,
        "password_hash": pwd_context.hash("admin123"),
    },
    {
        "id": "u2",
        "username": "sarah",
        "name": "Sarah Cohen",
        "email": "sarah@company.com",
        "role": "operator",
        "teams": ["BLOCK"],
        "avatar": None,
        "password_hash": pwd_context.hash("sarah123"),
    },
    {
        "id": "u3",
        "username": "john",
        "name": "John Smith",
        "email": "john@company.com",
        "role": "viewer",
        "teams": ["NASA"],
        "avatar": None,
        "password_hash": pwd_context.hash("john123"),
    },
    {
        "id": "u4",
        "username": "maya",
        "name": "Maya Levi",
        "email": "maya@company.com",
        "role": "operator",
        "teams": ["BLOCK", "NASA"],
        "avatar": None,
        "password_hash": pwd_context.hash("maya123"),
    },
]

TEAM_PERMISSIONS = {
    "BLOCK": ["rdm", "ds", "esx", "vms", "exch", "qtree", "refhael", "price", "herzitools", "netapp-upgrade", "netapp-multi-exec"],
    "NASA": ["qtree", "ds"],
}

VC_META = {
    "VC-TLV-01": {"id": "vc-1", "location": "Tel Aviv", "status": "healthy", "version": "7.0.3"},
    "VC-NYC-01": {"id": "vc-2", "location": "New York", "status": "healthy", "version": "7.0.3"},
    "VC-LON-01": {"id": "vc-3", "location": "London", "status": "warning", "version": "7.0.4"},
    "VC-TEST": {"id": "vc-4", "location": "Lab", "status": "healthy", "version": "8.0.0"},
}

# Separate dictionaries for each object type (as requested)
# DS required keys: name, vc, ds_cluster, size
# size is stored in GB
DATASTORES_BY_VC_CLUSTER: dict[str, dict[str, dict[str, dict[str, Any]]]] = {
    "VC-TLV-01": {
        "Cluster-01": {
            "DS-TLV-FAST-01": {"name": "DS-TLV-FAST-01", "vc": "VC-TLV-01", "ds_cluster": "DS-Cluster-A", "size": 24576},
            "DS-TLV-BACKUP-01": {"name": "DS-TLV-BACKUP-01", "vc": "VC-TLV-01", "ds_cluster": "DS-Cluster-A", "size": 57344},
        }
    },
    "VC-NYC-01": {
        "Cluster-02": {
            "DS-NYC-CAP-01": {"name": "DS-NYC-CAP-01", "vc": "VC-NYC-01", "ds_cluster": "DS-Cluster-B", "size": 36864},
            "DS-NYC-ARCHIVE-01": {"name": "DS-NYC-ARCHIVE-01", "vc": "VC-NYC-01", "ds_cluster": "DS-Cluster-B", "size": 49152},
        }
    },
    "VC-LON-01": {
        "Cluster-03": {
            "DS-LON-OPS-01": {"name": "DS-LON-OPS-01", "vc": "VC-LON-01", "ds_cluster": "DS-Cluster-C", "size": 12288},
            "DS-LON-BACKUP-01": {"name": "DS-LON-BACKUP-01", "vc": "VC-LON-01", "ds_cluster": "DS-Cluster-C", "size": 20480},
        }
    },
    # Explicit example in the format user provided
    "VC-TEST": {
        "clusterA-test": {
            "datastoreA": {"name": "datastoreA", "vc": "VC-TEST", "ds_cluster": "clusterA-test", "size": 8192},
            "datastoreB": {"name": "datastoreB", "vc": "VC-TEST", "ds_cluster": "clusterA-test", "size": 10240},
        }
    },
    "VC-TEST2": {
        "clusterA-test2": {
            "datastoreA2": {"name": "datastoreA2", "vc": "VC-TEST2", "ds_cluster": "clusterA-test2", "size": 6144},
            "datastoreB2": {"name": "datastoreB2", "vc": "VC-TEST2", "ds_cluster": "clusterA-test2", "size": 9216},
        }
    },
    "VC-TEST3": {
        "clusterA-test3": {
            "datastoreA3": {"name": "datastoreA3", "vc": "VC-TEST3", "ds_cluster": "clusterA-test3", "size": 7168},
            "datastoreB3": {"name": "datastoreB3", "vc": "VC-TEST3", "ds_cluster": "clusterA-test3", "size": 11264},
        }
    },
}
# VM required keys: name, naas_of_rdms, datastore, vc
VMS_BY_VC_CLUSTER: dict[str, dict[str, dict[str, dict[str, Any]]]] = {
    "VC-TLV-01": {
        "Cluster-01": {
            "web-prod-001": {
                "name": "web-prod-001",
                "naas_of_rdms": ["naa.6000A0A1B2C30001", "naa.6000A0A1B2C30002"],
                "datastore": "DS-TLV-FAST-01",
                "vc": "VC-TLV-01",
            },
            "api-prod-002": {
                "name": "api-prod-002",
                "naas_of_rdms": [],
                "datastore": "DS-TLV-BACKUP-01",
                "vc": "VC-TLV-01",
            },
        }
    },
    "VC-NYC-01": {
        "Cluster-02": {
            "db-prod-005": {
                "name": "db-prod-005",
                "naas_of_rdms": ["naa.6000A0A1B2C30003"],
                "datastore": "DS-NYC-CAP-01",
                "vc": "VC-NYC-01",
            },
            "batch-stg-006": {
                "name": "batch-stg-006",
                "naas_of_rdms": [],
                "datastore": "DS-NYC-ARCHIVE-01",
                "vc": "VC-NYC-01",
            },
        }
    },
    "VC-LON-01": {
        "Cluster-03": {
            "app-stg-012": {
                "name": "app-stg-012",
                "naas_of_rdms": ["naa.6000A0A1B2C30003","naa.6000A0A1B2C30003","naa.6000A0A1B2C30003","naa.6000A0A1B2C30003","naa.6000A0A1B2C30003","naa.6000A0A1B2C30003","naa.6000A0A1B2C30003"],
                "datastore": "DS-LON-OPS-01",
                "vc": "VC-LON-01",
            },
            "tools-dev-013": {
                "name": "tools-dev-013",
                "naas_of_rdms": [],
                "datastore": "DS-LON-BACKUP-01",
                "vc": "VC-LON-01",
            },
        }
    },
    "VC-TEST": {
        "clusterA-test": {
            "vm-test-a": {
                "name": "vm-test-a",
                "naas_of_rdms": ["naa.test.1001"],
                "datastore": "datastoreA",
                "vc": "VC-TEST",
            },
            "vm-test-b": {
                "name": "vm-test-b",
                "naas_of_rdms": [],
                "datastore": "datastoreB",
                "vc": "VC-TEST",
            },
        }
    },
}

# ESX required keys: name, vc, esx_cluster, pwwns
ESX_BY_VC_CLUSTER: dict[str, dict[str, dict[str, dict[str, Any]]]] = {
    "VC-TLV-01": {
        "Cluster-01": {
            "ESX-TLV-01": {
                "name": "ESX-TLV-01",
                "vc": "VC-TLV-01",
                "esx_cluster": "Cluster-01",
                "pwwns": ["10:00:00:90:fa:90:11:01", "10:00:00:90:fa:90:11:02"],
            },
            "ESX-TLV-02": {
                "name": "ESX-TLV-02",
                "vc": "VC-TLV-01",
                "esx_cluster": "Cluster-01",
                "pwwns": ["10:00:00:90:fa:90:11:03", "10:00:00:90:fa:90:11:04"],
            },
        }
    },
    "VC-NYC-01": {
        "Cluster-02": {
            "ESX-NYC-01": {
                "name": "ESX-NYC-01",
                "vc": "VC-NYC-01",
                "esx_cluster": "Cluster-02",
                "pwwns": ["10:00:00:90:fa:90:21:01", "10:00:00:90:fa:90:21:02"],
            },
            "ESX-NYC-02": {
                "name": "ESX-NYC-02",
                "vc": "VC-NYC-01",
                "esx_cluster": "Cluster-02",
                "pwwns": ["10:00:00:90:fa:90:21:03", "10:00:00:90:fa:90:21:04"],
            },
        }
    },
    "VC-LON-01": {
        "Cluster-03": {
            "ESX-LON-01": {
                "name": "ESX-LON-01",
                "vc": "VC-LON-01",
                "esx_cluster": "Cluster-03",
                "pwwns": ["10:00:00:90:fa:90:31:01", "10:00:00:90:fa:90:31:02"],
            }
        }
    },
    "VC-TEST": {
        "clusterA-test": {
            "esx-test-a": {
                "name": "esx-test-a",
                "vc": "VC-TEST",
                "esx_cluster": "clusterA-test",
                "pwwns": ["10:00:00:90:fa:90:41:01", "10:00:00:90:fa:90:41:02"],
            }
        }
    },
}

# RDM required keys: naa, vc, esx_cluster, size, connected
# size is stored in GB
RDMS_BY_VC_CLUSTER: dict[str, dict[str, dict[str, dict[str, Any]]]] = {
    "VC-TLV-01": {
        "Cluster-01": {
            "naa.6000A0A1B2C30001": {
                "naa": "naa.6000A0A1B2C30001",
                "vc": "VC-TLV-01",
                "esx_cluster": "Cluster-01",
                "size": 512,
                "connected": True,
            },
            "naa.6000A0A1B2C30002": {
                "naa": "naa.6000A0A1B2C30002",
                "vc": "VC-TLV-01",
                "esx_cluster": "Cluster-01",
                "size": 1024,
                "connected": False,
            },
        }
    },
    "VC-NYC-01": {
        "Cluster-02": {
            "naa.6000A0A1B2C30003": {
                "naa": "naa.6000A0A1B2C30003",
                "vc": "VC-NYC-01",
                "esx_cluster": "Cluster-02",
                "size": 2048,
                "connected": True,
            },
            "naa.6000A0A1B2C30004": {
                "naa": "naa.6000A0A1B2C30004",
                "vc": "VC-NYC-01",
                "esx_cluster": "Cluster-02",
                "size": 768,
                "connected": True,
            },
        }
    },
    "VC-LON-01": {
        "Cluster-03": {
            "naa.6000A0A1B2C30005": {
                "naa": "naa.6000A0A1B2C30005",
                "vc": "VC-LON-01",
                "esx_cluster": "Cluster-03",
                "size": 1536,
                "connected": False,
            }
        }
    },
    "VC-TEST": {
        "clusterA-test": {
            "naa.test.1001": {
                "naa": "naa.test.1001",
                "vc": "VC-TEST",
                "esx_cluster": "clusterA-test",
                "size": 256,
                "connected": True,
            }
        }
    },
}


def build_inventory_tree() -> dict[str, dict[str, Any]]:
    vc_names = set(DATASTORES_BY_VC_CLUSTER) | set(VMS_BY_VC_CLUSTER) | set(ESX_BY_VC_CLUSTER) | set(RDMS_BY_VC_CLUSTER)
    tree: dict[str, dict[str, Any]] = {}

    for vc in sorted(vc_names):
        clusters = (
            set(DATASTORES_BY_VC_CLUSTER.get(vc, {}))
            | set(VMS_BY_VC_CLUSTER.get(vc, {}))
            | set(ESX_BY_VC_CLUSTER.get(vc, {}))
            | set(RDMS_BY_VC_CLUSTER.get(vc, {}))
        )

        tree[vc] = {}
        for cluster in sorted(clusters):
            tree[vc][cluster] = {
                "datastores": DATASTORES_BY_VC_CLUSTER.get(vc, {}).get(cluster, {}),
                "vms": VMS_BY_VC_CLUSTER.get(vc, {}).get(cluster, {}),
                "esx": ESX_BY_VC_CLUSTER.get(vc, {}).get(cluster, {}),
                "rdms": RDMS_BY_VC_CLUSTER.get(vc, {}).get(cluster, {}),
            }

    return tree


INVENTORY = build_inventory_tree()

EXCH_VOLUMES = [
    {
        "id": "vol-1",
        "name": "VOL-PROD-001",
        "aggregate": "AGG-01",
        "sizeGB": 1000,
        "usedGB": 620,
        "protocol": "NFS",
        "status": "online",
        "location": "Tel Aviv",
        "vcenter": "VC-TLV-01",
    },
    {
        "id": "vol-2",
        "name": "VOL-STG-002",
        "aggregate": "AGG-02",
        "sizeGB": 500,
        "usedGB": 130,
        "protocol": "iSCSI",
        "status": "online",
        "location": "New York",
        "vcenter": "VC-NYC-01",
    },
]

NETAPP_MACHINES = [
    {
        "id": "na-tlv-01",
        "name": "NA-TLV-01",
        "host": "10.120.10.21",
        "cluster": "TLV-Cluster-A",
        "location": "Tel Aviv",
        "version": "ONTAP 9.13.1P8",
    },
    {
        "id": "na-nyc-01",
        "name": "NA-NYC-01",
        "host": "10.220.10.44",
        "cluster": "NYC-Cluster-B",
        "location": "New York",
        "version": "ONTAP 9.12.1P11",
    },
    {
        "id": "na-lon-01",
        "name": "NA-LON-01",
        "host": "10.320.10.99",
        "cluster": "LON-Cluster-C",
        "location": "London",
        "version": "ONTAP 9.14.1",
    },
    {
        "id": "na-lab-01",
        "name": "NA-LAB-01",
        "host": "10.99.10.10",
        "cluster": "LAB-Cluster-Z",
        "location": "Lab",
        "version": "ONTAP 9.15.0RC1",
    },
]

QTREES = [
    {
        "id": "qt-1",
        "name": "QT-SHARE-001",
        "volume": "VOL-PROD-001",
        "securityStyle": "unix",
        "exportPolicy": "default",
        "status": "active",
        "sizeGB": 250,
        "location": "Tel Aviv",
        "vcenter": "VC-TLV-01",
    }
]


class LocalLoginPayload(BaseModel):
    username: str
    password: str | None = None


class CalculatePayload(BaseModel):
    machineType: str
    size: float
    iops: float | None = None
    replicas: float | None = None
    srdf: bool | None = None


class HerziPayload(BaseModel):
    input: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def permissions_for_teams(teams: list[str]) -> list[str]:
    merged: set[str] = set()
    for team in teams:
        merged.update(TEAM_PERMISSIONS.get(team, []))
    return sorted(merged)


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "teams": user.get("teams", []),
        "avatar": user.get("avatar"),
    }


def issue_access_token(user: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "teams": user.get("teams", []),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_TTL_MIN)).timestamp()),
        "jti": uuid4().hex,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_TTL_MIN * 60,
        path="/",
        domain=COOKIE_DOMAIN,
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=ACCESS_COOKIE_NAME,
        path="/",
        domain=COOKIE_DOMAIN,
    )


def find_user_by_username_or_email(username: str) -> dict[str, Any] | None:
    normalized = username.strip().lower()
    return next(
        (
            user
            for user in USERS_DB
            if user["username"].lower() == normalized or user["email"].split("@")[0].lower() == normalized
        ),
        None,
    )


def validate_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return next((user for user in USERS_DB if user["id"] == user_id), None)


def current_user_from_request(request: Request) -> dict[str, Any] | None:
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    return validate_token(token)


PUBLIC_PATHS = {
    "/health",
    "/auth/login/local",
    "/auth/login/adfs",
    "/auth/session",
    "/auth/permissions",
}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if path in PUBLIC_PATHS:
        return await call_next(request)

    if not current_user_from_request(request):
        origin = request.headers.get("origin")
        headers = {}
        if origin in ALLOWED_ORIGINS:
            headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Vary": "Origin",
            }
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"}, headers=headers)

    return await call_next(request)


def iter_inventory():
    for vc_name, vc_data in INVENTORY.items():
        vc_meta = VC_META.get(vc_name, {})
        for cluster_name, cluster_data in vc_data.items():
            yield vc_name, vc_meta, cluster_name, cluster_data


def flatten_datastores() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for _vc_name, _vc_meta, _cluster_name, cluster_data in iter_inventory():
        for ds in cluster_data.get("datastores", {}).values():
            rows.append(
                {
                    "name": ds["name"],
                    "vc": ds["vc"],
                    "ds_cluster": ds["ds_cluster"],
                    "size": ds["size"],
                }
            )
    return rows


def flatten_esx_hosts() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for _vc_name, _vc_meta, _cluster_name, cluster_data in iter_inventory():
        for esx in cluster_data.get("esx", {}).values():
            rows.append(
                {
                    "name": esx["name"],
                    "vc": esx["vc"],
                    "esx_cluster": esx["esx_cluster"],
                    "pwwns": esx["pwwns"],
                }
            )
    return rows


def flatten_rdms() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for _vc_name, _vc_meta, _cluster_name, cluster_data in iter_inventory():
        for rdm in cluster_data.get("rdms", {}).values():
            rows.append(
                {
                    "naa": rdm["naa"],
                    "vc": rdm["vc"],
                    "esx_cluster": rdm["esx_cluster"],
                    "size": rdm["size"],
                    "connected": rdm["connected"],
                }
            )
    return rows


def flatten_vms() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for _vc_name, _vc_meta, _cluster_name, cluster_data in iter_inventory():
        for vm in cluster_data.get("vms", {}).values():
            rows.append(
                {
                    "name": vm["name"],
                    "naas_of_rdms": vm["naas_of_rdms"],
                    "datastore": vm["datastore"],
                    "vc": vm["vc"],
                }
            )
    return rows


def get_vcenter_names() -> list[str]:
    return sorted(INVENTORY.keys())


def make_job(action_label: str) -> dict[str, Any]:
    return {
        "jobId": f"JOB-{int(datetime.now().timestamp() * 1000)}",
        "action": action_label,
        "steps": [
            {"name": "Validating parameters", "status": "pending", "duration": 1200},
            {"name": "Connecting to storage", "status": "pending", "duration": 1500},
            {"name": "Executing operation", "status": "pending", "duration": 2200},
            {"name": "Verifying result", "status": "pending", "duration": 1000},
        ],
    }


def find_netapp_machine(machine_name: str | None) -> dict[str, Any] | None:
    if not machine_name:
        return None
    normalized = machine_name.strip().lower()
    return next(
        (
            machine
            for machine in NETAPP_MACHINES
            if machine["name"].lower() == normalized
            or machine["id"].lower() == normalized
            or machine["host"].lower() == normalized
        ),
        None,
    )


def build_demo_output_lines(command: str, machine: str, username: str) -> list[str]:
    lowered = command.lower()
    lines = [f"{username}@{machine}> {command}", "Validating command and session context..."]

    if "image show" in lowered or "version" in lowered:
        lines.extend(
            [
                "Node      Current-Version  Is-Default  Last-Updated",
                "node-01   9.13.1P8         true        2026-01-22T07:11:54Z",
                "node-02   9.13.1P8         true        2026-01-22T07:12:03Z",
            ]
        )
    elif "health" in lowered:
        lines.extend(
            [
                "Cluster health check in progress...",
                "Interconnect status: ok",
                "Storage failover: enabled",
                "Final status: healthy",
            ]
        )
    elif "download" in lowered or "package" in lowered:
        lines.extend(
            [
                "Resolving package metadata...",
                "Package checksum verified (sha256).",
                "Package staged to /mroot/etc/software.",
            ]
        )
    elif "upgrade" in lowered:
        lines.extend(
            [
                "Upgrade workflow started.",
                "Taking pre-upgrade snapshots...",
                "Node node-01 entered takeover window.",
                "Node node-02 upgrade checkpoint completed.",
            ]
        )
    else:
        lines.extend(
            [
                "Command accepted by ONTAP CLI simulator.",
                "Operation executed in demo mode.",
            ]
        )

    lines.append("Completed with exit code 0.")
    return lines


def build_demo_output_text(command: str, machine: str, username: str) -> str:
    return "\n".join(build_demo_output_lines(command, machine, username))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": now_iso()}


@app.get("/inventory/tree")
def inventory_tree() -> dict[str, Any]:
    return INVENTORY


@app.post("/auth/login/local")
def login_local(payload: LocalLoginPayload, response: Response) -> dict[str, Any]:
    user = find_user_by_username_or_email(payload.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    provided_password = payload.password or ""
    if not pwd_context.verify(provided_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = issue_access_token(user)
    set_auth_cookie(response, token)

    user_public = public_user(user)
    teams = user_public.get("teams", [])
    return {
        "user": user_public,
        "authMode": "local",
        "teams": teams,
        "permissions": permissions_for_teams(teams),
    }


@app.post("/auth/login/adfs")
def login_adfs(response: Response) -> dict[str, Any]:
    user = next((item for item in USERS_DB if item["email"] == "maya@company.com"), USERS_DB[0])
    token = issue_access_token(user)
    set_auth_cookie(response, token)

    user_public = public_user(user)
    teams = user_public.get("teams", [])
    return {
        "user": user_public,
        "authMode": "adfs",
        "teams": teams,
        "permissions": permissions_for_teams(teams),
    }


@app.get("/auth/session")
def session(request: Request) -> Any:
    user = current_user_from_request(request)
    if not user:
        return None

    user_public = public_user(user)
    teams = user_public.get("teams", [])
    return {
        "user": user_public,
        "authMode": "cookie",
        "teams": teams,
        "permissions": permissions_for_teams(teams),
    }


@app.get("/auth/permissions")
def auth_permissions(request: Request, teams: list[str] | None = None) -> dict[str, Any]:
    team_list = teams or []
    if not team_list:
        for key, value in request.query_params.multi_items():
            if key in ("teams", "teams[]") and value:
                team_list.append(value)
    if not team_list:
        user = current_user_from_request(request)
        if user:
            team_list = user.get("teams", [])
    return {"teams": team_list, "permissions": permissions_for_teams(team_list)}


@app.post("/auth/logout")
def logout(response: Response) -> dict[str, bool]:
    clear_auth_cookie(response)
    return {"ok": True}


@app.get("/vms")
def get_vms() -> list[dict[str, Any]]:
    return flatten_vms()


@app.get("/datastores")
def get_datastores() -> list[dict[str, Any]]:
    return flatten_datastores()


@app.get("/esx-hosts")
def get_esx_hosts() -> list[dict[str, Any]]:
    return flatten_esx_hosts()


@app.get("/rdms")
def get_rdms() -> list[dict[str, Any]]:
    return flatten_rdms()


@app.get("/vcenters")
def get_vcenters() -> list[str]:
    return get_vcenter_names()


@app.get("/netapp/machines")
def get_netapp_machines() -> list[dict[str, str]]:
    return NETAPP_MACHINES


@app.get("/exch/volumes")
def get_exch_volumes() -> list[dict[str, Any]]:
    return EXCH_VOLUMES


@app.get("/qtrees")
def get_qtrees() -> list[dict[str, Any]]:
    return QTREES


@app.get("/users")
def get_users() -> list[dict[str, Any]]:
    return [public_user(u) for u in USERS_DB]


@app.get("/vms/names")
def vm_names() -> list[str]:
    return [item["name"] for item in flatten_vms()]


@app.get("/datastores/names")
def datastore_names() -> list[str]:
    return [item["name"] for item in flatten_datastores()]


@app.get("/rdm/names")
def rdm_names() -> list[str]:
    return [item["naa"] for item in flatten_rdms()]


@app.get("/esx/names")
def esx_names() -> list[str]:
    return [item["name"] for item in flatten_esx_hosts()]


@app.get("/volumes")
def volumes() -> list[str]:
    return [item["name"] for item in EXCH_VOLUMES]


@app.get("/aggregates")
def aggregates() -> list[str]:
    return ["AGG-01", "AGG-02", "AGG-03", "AGG-04", "AGG-05"]


@app.get("/clusters/by-vc")
def clusters_by_vc(vc: str | None = None) -> list[str]:
    if not vc:
        return []
    return sorted((INVENTORY.get(vc) or {}).keys())


@app.get("/esx/by-cluster")
def esx_by_cluster(cluster: str | None = None) -> list[str]:
    if not cluster:
        return []
    rows: list[str] = []
    for _vc_name, _vc_meta, _cluster_name, cluster_data in iter_inventory():
        if _cluster_name == cluster:
            rows.extend([item["name"] for item in cluster_data.get("esx", {}).values()])
    return rows


@app.get("/jobs/status")
def job_status(jobId: str) -> dict[str, str]:
    return {"jobId": jobId, "status": "running"}


@app.post("/price/calculate")
def price_calculate(payload: CalculatePayload) -> dict[str, Any]:
    mt = payload.machineType.upper()
    size = payload.size
    if mt == "NETAPP":
        iops = payload.iops or 0
        return {
            "price": f"{(size * 0.15 + iops * 0.005):.2f}",
            "monthlyCost": f"{(size * 0.15 * 30):.2f}",
            "iopsAllocated": int(iops or 1000),
            "throughput": f"{round((iops or 1000) * 0.032)} MB/s",
            "tier": "Enterprise" if size > 5000 else "Standard" if size > 1000 else "Basic",
        }
    if mt == "PFLEX":
        replicas = payload.replicas or 1
        return {
            "price": f"{(size * 0.12 + replicas * 50):.2f}",
            "monthlyCost": f"{(size * 0.12 * 30 + replicas * 50 * 30):.2f}",
            "replicaCount": int(replicas),
            "compressionRatio": "2.3:1",
            "effectiveCapacity": f"{size * 2.3:.0f} GB",
        }
    if mt == "PMAX":
        srdf_extra = 200 if payload.srdf else 0
        return {
            "price": f"{(size * 0.20 + srdf_extra):.2f}",
            "monthlyCost": f"{(size * 0.20 * 30 + srdf_extra * 30):.2f}",
            "srdfEnabled": bool(payload.srdf),
            "raidLevel": "RAID 6",
            "cacheHitRate": "94%",
        }
    return {"price": "0.00", "error": "Unknown machine type"}


@app.post("/refhael/process-files")
def process_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    note: str | None = Form(default=None),
) -> dict[str, Any]:
    _ = file1.filename, file2.filename, note
    return {
        "success": True,
        "downloadUrl": "#demo-download",
        "fileName": f"result_{int(datetime.now().timestamp())}.xlsx",
    }


HERZI_RESPONSES = {
    "/herzi/vc-info": lambda q: f"vCenter: {q}\nVersion: 7.0.3\nHost Count: 12\nVM Count: 156\nStatus: Healthy",
    "/herzi/vc-health": lambda q: f"Input: {q}\nStatus: Healthy\nCPU Usage: 45%\nMemory: 62%\nStorage: 71%\nAlarms: 0",
    "/herzi/vm-lookup": lambda q: f"VM: {q}\nvCenter: VC-TLV-01\nHost: ESX-TLV-01\nIP: 10.10.0.11\nStatus: Running",
    "/herzi/vm-snapshot": lambda q: f"VM: {q}\nSnapshots: 3\nOldest: 2025-01-15\nTotal Size: 12.5 GB",
    "/herzi/ds-usage": lambda q: f"Datastore: {q}\nCapacity: 10 TB\nUsed: 6.2 TB\nFree: 38%\nVMs: 18",
    "/herzi/ds-vms": lambda q: f"Datastore: {q}\n\nVMs:\n1. web-prod-001\n2. db-prod-005\n3. app-stg-012",
    "/herzi/naa-lookup": lambda q: f"NAA: {q}\nType: VMFS\nDatastore: DS-TLV-FAST-01\nCapacity: 500 GB\nStatus: Active",
    "/herzi/naa-mapping": lambda q: f"NAA: {q}\nMapped to: DS-NYC-CAP-01\nHost: ESX-NYC-01\nLUN ID: 12",
    "/herzi/vm-naa": lambda q: f"VM: {q}\n\nNAA Devices:\n1. naa.6000A0A1B2C30001 (100 GB)\n2. naa.6000A0A1B2C30002 (200 GB)",
}


@app.post("/herzi/{tool_name:path}")
def herzi_tools(tool_name: str, payload: HerziPayload) -> str:
    endpoint = f"/herzi/{tool_name}"
    handler = HERZI_RESPONSES.get(endpoint)
    if handler is None:
        return "No data found"
    return handler(payload.input)


@app.websocket("/ws/demo/netapp")
async def ws_netapp_demo(websocket: WebSocket):
    await websocket.accept()
    session: dict[str, Any] = {
        "connected": False,
        "machine": "",
        "username": "",
    }

    await websocket.send_json(
        {
            "type": "hello",
            "mode": "netapp-demo",
            "message": "Websocket connected. Send auth then command.",
            "timestamp": now_iso(),
        }
    )

    try:
        while True:
            payload = await websocket.receive_json()
            message_type = str(payload.get("type") or "").strip()

            if message_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": now_iso()})
                continue

            if message_type == "auth":
                requested_machine = str(payload.get("machine") or "").strip()
                requested_username = str(payload.get("username") or "").strip()
                requested_password = str(payload.get("password") or "").strip()

                if not requested_username or not requested_password:
                    await websocket.send_json({"type": "error", "message": "Username and password are required."})
                    continue

                machine_data = find_netapp_machine(requested_machine)
                machine_name = machine_data["name"] if machine_data else requested_machine

                session["connected"] = True
                session["machine"] = machine_name
                session["username"] = requested_username

                await websocket.send_json(
                    {
                        "type": "auth_ok",
                        "connected": True,
                        "machine": machine_name,
                        "username": requested_username,
                        "message": f"Authenticated to {machine_name}.",
                        "timestamp": now_iso(),
                    }
                )
                continue

            if message_type == "command":
                command = str(payload.get("command") or "").strip()
                if not command:
                    await websocket.send_json({"type": "error", "message": "Command is required."})
                    continue

                if not session["connected"]:
                    await websocket.send_json({"type": "error", "message": "Authenticate first."})
                    continue

                selected_machine = str(payload.get("machine") or session["machine"]).strip()
                selected_username = str(session["username"] or "admin").strip()

                if not selected_machine:
                    await websocket.send_json({"type": "error", "message": "Machine is required."})
                    continue

                await asyncio.sleep(random.uniform(0.12, 0.32))
                await websocket.send_json(
                    {
                        "type": "response",
                        "machine": selected_machine,
                        "output": build_demo_output_text(command, selected_machine, selected_username),
                        "timestamp": now_iso(),
                    }
                )
                continue

            if message_type == "connect":
                requested_machine = str(payload.get("machine") or "").strip()
                requested_username = str(payload.get("username") or "admin").strip() or "admin"
                machine_data = find_netapp_machine(requested_machine)
                machine_name = machine_data["name"] if machine_data else requested_machine

                session["connected"] = True
                session["machine"] = machine_name
                session["username"] = requested_username

                await websocket.send_json(
                    {
                        "type": "session",
                        "connected": True,
                        "machine": machine_name,
                        "username": requested_username,
                        "message": f"Connected to {machine_name} in demo mode.",
                        "timestamp": now_iso(),
                    }
                )
                continue

            if message_type == "disconnect_session":
                session["connected"] = False
                session["machine"] = ""
                session["username"] = ""
                await websocket.send_json(
                    {
                        "type": "session",
                        "connected": False,
                        "machine": "",
                        "username": "",
                        "message": "Session disconnected.",
                        "timestamp": now_iso(),
                    }
                )
                continue

            if message_type == "run_command":
                command = str(payload.get("command") or "").strip()
                if not command:
                    await websocket.send_json({"type": "error", "message": "Command is required."})
                    continue

                selected_machine = str(payload.get("machine") or session["machine"]).strip()
                selected_username = str(payload.get("username") or session["username"] or "admin").strip()
                command_id = str(payload.get("commandId") or uuid4().hex)

                if not selected_machine:
                    await websocket.send_json({"type": "error", "commandId": command_id, "message": "Machine is required."})
                    continue

                await websocket.send_json(
                    {
                        "type": "command_start",
                        "commandId": command_id,
                        "machine": selected_machine,
                        "command": command,
                        "timestamp": now_iso(),
                    }
                )

                for line in build_demo_output_lines(command, selected_machine, selected_username):
                    await asyncio.sleep(random.uniform(0.08, 0.22))
                    await websocket.send_json(
                        {
                            "type": "command_output",
                            "commandId": command_id,
                            "machine": selected_machine,
                            "line": line,
                            "timestamp": now_iso(),
                        }
                    )

                await websocket.send_json(
                    {
                        "type": "command_done",
                        "commandId": command_id,
                        "machine": selected_machine,
                        "exitCode": 0,
                        "timestamp": now_iso(),
                    }
                )
                continue

            if message_type == "run_multi":
                command = str(payload.get("command") or "").strip()
                machines = [str(item).strip() for item in payload.get("machines", []) if str(item).strip()]
                username = str(payload.get("username") or "admin").strip() or "admin"

                if not command:
                    await websocket.send_json({"type": "error", "message": "Command is required."})
                    continue

                if not machines:
                    await websocket.send_json({"type": "error", "message": "At least one machine is required."})
                    continue

                batch_id = str(payload.get("batchId") or uuid4().hex)
                await websocket.send_json(
                    {
                        "type": "multi_start",
                        "batchId": batch_id,
                        "command": command,
                        "machines": machines,
                        "timestamp": now_iso(),
                    }
                )

                for machine_name in machines:
                    command_id = f"{batch_id}:{machine_name}"
                    await websocket.send_json(
                        {
                            "type": "command_start",
                            "batchId": batch_id,
                            "commandId": command_id,
                            "machine": machine_name,
                            "command": command,
                            "timestamp": now_iso(),
                        }
                    )
                    for line in build_demo_output_lines(command, machine_name, username):
                        await asyncio.sleep(random.uniform(0.06, 0.2))
                        await websocket.send_json(
                            {
                                "type": "command_output",
                                "batchId": batch_id,
                                "commandId": command_id,
                                "machine": machine_name,
                                "line": line,
                                "timestamp": now_iso(),
                            }
                        )
                    await websocket.send_json(
                        {
                            "type": "command_done",
                            "batchId": batch_id,
                            "commandId": command_id,
                            "machine": machine_name,
                            "exitCode": 0,
                            "timestamp": now_iso(),
                        }
                    )

                await websocket.send_json(
                    {
                        "type": "multi_done",
                        "batchId": batch_id,
                        "machines": machines,
                        "successCount": len(machines),
                        "failedCount": 0,
                        "timestamp": now_iso(),
                    }
                )
                continue

            await websocket.send_json({"type": "error", "message": f"Unsupported message type: {message_type}"})
    except WebSocketDisconnect:
        return


@app.post("/{path:path}")
def generic_actions(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    _ = payload
    return make_job(f"/{path}")
