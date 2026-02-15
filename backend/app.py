from __future__ import annotations

import asyncio
import json
import os
import random
import time
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
try:
    TROUBLESHOOTER_DELAY_MS = max(0, int(os.getenv("TROUBLESHOOTER_DELAY_MS", "4500")))
except ValueError:
    TROUBLESHOOTER_DELAY_MS = 4500

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


USERS_DB: list[dict[str, Any]] = [
    {
        "id": "u1",
        "username": "admin",
        "name": "Admin User",
        "email": "admin@company.com",
        "role": "admin",
        "teams": ["BLOCK", "NASA","Shimiada","Vans"],
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
    "BLOCK": ["rdm", "ds", "esx", "vms", "exch", "qtree", "refael", "price", "herzitools", "netapp-upgrade", "netapp-multi-exec", "mds-builder"],
    "NASA": ["qtree", "ds"],
    "Shimiada": ["price", "refael"],
    "Vans": ["herzitools"],
    "Virtu": ["esx"],
    "Team49": ["qtree"],
    "Orca": ["herzitools"],
}
TEAM_PERMISSION_FLAGS = {
    "BLOCK": "isBlock",
    "NASA": "isNasa",
    "Shimiada": "isShimiada",
    "Vans": "isStorageAdmin",
    "Virtu": "isVirualizationAdmin",
    "Team49": "is49Client",
    "Orca": "isOrcaAdmin",
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


def seed_demo_inventory() -> None:
    for idx in range(4, 29):
        vc_name = f"VC-DEMO-{idx:02d}"
        cluster_name = f"Cluster-DEMO-{idx:02d}"
        ds_name = f"DS-DEMO-{idx:02d}-01"
        vm_name = f"vm-demo-{idx:02d}"
        esx_name = f"ESX-DEMO-{idx:02d}-01"
        naa_name = f"naa.demo.{idx:04d}"

        VC_META[vc_name] = {
            "id": f"vc-demo-{idx:02d}",
            "location": "Demo Lab",
            "status": "healthy" if idx % 3 else "warning",
            "version": "8.0.2",
        }

        DATASTORES_BY_VC_CLUSTER[vc_name] = {
            cluster_name: {
                ds_name: {
                    "name": ds_name,
                    "vc": vc_name,
                    "ds_cluster": f"DS-Cluster-DEMO-{idx:02d}",
                    "size": 8192 + (idx * 256),
                },
            },
        }

        VMS_BY_VC_CLUSTER[vc_name] = {
            cluster_name: {
                vm_name: {
                    "name": vm_name,
                    "naas_of_rdms": [naa_name],
                    "datastore": ds_name,
                    "vc": vc_name,
                },
            },
        }

        ESX_BY_VC_CLUSTER[vc_name] = {
            cluster_name: {
                esx_name: {
                    "name": esx_name,
                    "vc": vc_name,
                    "esx_cluster": cluster_name,
                    "pwwns": [
                        f"10:00:00:90:fa:90:{idx:02d}:01",
                        f"10:00:00:90:fa:90:{idx:02d}:02",
                    ],
                },
            },
        }

        RDMS_BY_VC_CLUSTER[vc_name] = {
            cluster_name: {
                naa_name: {
                    "naa": naa_name,
                    "vc": vc_name,
                    "esx_cluster": cluster_name,
                    "size": 256 + (idx * 12),
                    "connected": idx % 2 == 0,
                },
            },
        }


seed_demo_inventory()


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


def seed_demo_netapps() -> None:
    for idx in range(2, 13):
        NETAPP_MACHINES.append(
            {
                "id": f"na-demo-{idx:02d}",
                "name": f"NA-DEMO-{idx:02d}",
                "host": f"10.150.{idx}.20",
                "cluster": f"DEMO-Cluster-{idx:02d}",
                "location": "Demo Lab",
                "version": "ONTAP 9.14.1",
            }
        )


seed_demo_netapps()

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


class AuthUploadPayload(BaseModel):
    username: str


class CalculatePayload(BaseModel):
    machineType: str
    size: float
    iops: float | None = None
    replicas: float | None = None
    srdf: bool | None = None


class HerziPayload(BaseModel):
    input: str | list[str]


class TroubleshooterVCRequest(BaseModel):
    vc_name: str


class TroubleshooterNetappRequest(BaseModel):
    netapp_name: str


class TroubleshooterNaasRequest(BaseModel):
    naas: list[str]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def apply_troubleshooter_delay() -> None:
    if TROUBLESHOOTER_DELAY_MS <= 0:
        return
    await asyncio.sleep(TROUBLESHOOTER_DELAY_MS / 1000)


def permissions_for_teams(teams: list[str]) -> list[str]:
    merged: set[str] = set()
    for team in teams:
        merged.update(TEAM_PERMISSIONS.get(team, []))
    return sorted(merged)


def all_known_teams() -> list[str]:
    # Include every team that can be represented in auth flags.
    return sorted(TEAM_PERMISSION_FLAGS.keys())


def is_admin_user(user: dict[str, Any] | None) -> bool:
    return str((user or {}).get("role", "")).strip().lower() == "admin"


def effective_user_teams(user: dict[str, Any]) -> list[str]:
    if is_admin_user(user):
        return all_known_teams()
    return [str(team).strip() for team in user.get("teams", []) if str(team).strip()]


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "teams": effective_user_teams(user),
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


def parse_query_list(request: Request, keys: set[str]) -> list[str]:
    values: list[str] = []
    for key, value in request.query_params.multi_items():
        if key not in keys:
            continue
        for item in str(value or "").replace("\n", ",").split(","):
            normalized = item.strip()
            if normalized:
                values.append(normalized)
    return values


def parse_team_list(request: Request, teams: list[str] | None = None) -> list[str]:
    def normalize_team(value: str) -> str | None:
        normalized = str(value or "").strip()
        if not normalized:
            return None
        if normalized in TEAM_PERMISSIONS:
            return normalized

        lowered = normalized.lower()
        for team_name, permission_flag in TEAM_PERMISSION_FLAGS.items():
            if lowered == permission_flag.lower():
                return team_name
        return None

    raw_team_values = [str(team).strip() for team in (teams or []) if str(team).strip()]
    if not raw_team_values:
        raw_team_values = parse_query_list(request, {"teams", "teams[]"})

    normalized_teams: list[str] = []
    for team_value in raw_team_values:
        normalized = normalize_team(team_value)
        if normalized and normalized not in normalized_teams:
            normalized_teams.append(normalized)
    return normalized_teams


def build_team_access_map(team_list: list[str]) -> dict[str, bool]:
    if not TEAM_PERMISSION_FLAGS:
        return {}
    enabled = {str(team).strip() for team in team_list if str(team).strip()}
    return {
        flag: team in enabled
        for team, flag in TEAM_PERMISSION_FLAGS.items()
    }


PUBLIC_PATHS = {
    "/health",
    "/login/local",
    "/auth_upload",
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
    if path in PUBLIC_PATHS or path.startswith("/auth_check/"):
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


def get_vm_names_by_vc(vc: str | None = None) -> list[str]:
    if not vc:
        return []
    return sorted(
        {
            item["name"]
            for item in flatten_vms()
            if item.get("vc") == vc and item.get("name")
        }
    )


def get_ds_clusters_for_vc(vc: str | None = None) -> list[str]:
    if not vc:
        return []
    return sorted(
        {
            item["ds_cluster"]
            for item in flatten_datastores()
            if item.get("vc") == vc and item.get("ds_cluster")
        }
    )


def get_esx_clusters_for_vc(vc: str | None = None) -> list[str]:
    if not vc:
        return []
    return sorted(
        {
            item["esx_cluster"]
            for item in flatten_esx_hosts()
            if item.get("vc") == vc and item.get("esx_cluster")
        }
    )


def get_datastore_names_by_vc_cluster(vc: str | None = None, ds_cluster: str | None = None) -> list[str]:
    if not vc or not ds_cluster:
        return []
    return sorted(
        {
            item["name"]
            for item in flatten_datastores()
            if item.get("vc") == vc and item.get("ds_cluster") == ds_cluster and item.get("name")
        }
    )


def get_rdm_naas_by_vc_cluster(vc: str | None = None, esx_cluster: str | None = None) -> list[str]:
    if not vc or not esx_cluster:
        return []
    return sorted(
        {
            item["naa"]
            for item in flatten_rdms()
            if item.get("vc") == vc and item.get("esx_cluster") == esx_cluster and item.get("naa")
        }
    )


def get_esx_names_by_vc_cluster(vc: str | None = None, esx_cluster: str | None = None) -> list[str]:
    if not vc or not esx_cluster:
        return []
    return sorted(
        {
            item["name"]
            for item in flatten_esx_hosts()
            if item.get("vc") == vc and item.get("esx_cluster") == esx_cluster and item.get("name")
        }
    )


JOBS_STORE: dict[str, dict[str, Any]] = {}


def _utc_now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _build_job_step_blueprint(action_label: str) -> list[dict[str, Any]]:
    action_key = action_label.lower()

    if "/cluster/" in action_key:
        names = [
            "Validate parameters",
            "Reserve cluster resources",
            "Apply cluster configuration",
            "Register in vCenter",
            "Verify cluster health",
        ]
        durations = [1000, 1600, 2200, 1500, 1300]
    elif any(token in action_key for token in ("/delete", "/remove")):
        names = [
            "Validate parameters",
            "Check dependencies",
            "Execute removal",
            "Verify cleanup",
        ]
        durations = [1000, 1700, 2100, 1200]
    elif any(token in action_key for token in ("/create", "/add")):
        names = [
            "Validate parameters",
            "Reserve capacity",
            "Apply configuration",
            "Verify operation result",
        ]
        durations = [1000, 1500, 2300, 1300]
    elif "/extend" in action_key:
        names = [
            "Validate parameters",
            "Extend allocation",
            "Verify new size",
        ]
        durations = [1000, 2200, 1300]
    else:
        names = [
            "Validate request",
            "Execute operation",
            "Verify result",
        ]
        durations = [1000, 2400, 1300]

    return [{"name": name, "durationMs": durations[index]} for index, name in enumerate(names)]


def _create_job(action_label: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    job_id = f"JOB-{_utc_now_ms()}-{uuid4().hex[:6].upper()}"
    step_blueprint = _build_job_step_blueprint(action_label)
    fail_requested = bool((payload or {}).get("forceFail") or (payload or {}).get("simulateFail"))
    failure_step_index = len(step_blueprint) - 1 if fail_requested else None

    JOBS_STORE[job_id] = {
        "jobId": job_id,
        "action": action_label,
        "createdAtMs": _utc_now_ms(),
        "firstStatusServed": False,
        "firstStatusDelayMs": 1800,
        "steps": step_blueprint,
        "failureStepIndex": failure_step_index,
        "successMessage": f"Action {action_label} completed successfully.",
        "failureMessage": f"Action {action_label} failed during validation/verification.",
    }

    return {
        "jobId": job_id,
        "action": action_label,
        "status": "queued",
        "message": f"Action {action_label} request accepted. Job queued for execution.",
        "error": "",
    }


def _job_status_snapshot(job: dict[str, Any]) -> dict[str, Any]:
    steps = job.get("steps", [])
    if not steps:
        return {
            "jobId": job["jobId"],
            "action": job["action"],
            "status": "failed",
            "finished": True,
            "progress": 0,
            "steps": [],
            "message": "",
            "error": "No steps defined for this job.",
            "updatedAt": now_iso(),
        }

    elapsed_ms = max(0, _utc_now_ms() - int(job.get("createdAtMs", _utc_now_ms())))
    remaining_ms = elapsed_ms
    finished = False
    failed = False
    success_count = 0
    failure_step_index = job.get("failureStepIndex")
    step_states: list[dict[str, str]] = []

    for index, step in enumerate(steps):
        duration_ms = int(step.get("durationMs", 1000))
        step_name = str(step.get("name", f"Step {index + 1}"))
        step_status = "pending"

        if not failed:
            if remaining_ms <= 0:
                step_status = "pending"
            elif remaining_ms < duration_ms:
                step_status = "running"
                remaining_ms = 0
            else:
                remaining_ms -= duration_ms
                if failure_step_index == index:
                    step_status = "failed"
                    failed = True
                    finished = True
                else:
                    step_status = "success"
                    success_count += 1

        step_states.append({"name": step_name, "status": step_status})

    if not failed and success_count == len(steps):
        finished = True

    status = "failed" if failed else ("success" if finished else "running")
    progress = 100 if finished and not failed else int(round((success_count / len(steps)) * 100))
    message = job.get("successMessage", "") if status == "success" else ""
    error = job.get("failureMessage", "") if status == "failed" else ""

    return {
        "jobId": job["jobId"],
        "action": job["action"],
        "status": status,
        "finished": finished,
        "progress": progress,
        "steps": step_states,
        "message": message,
        "error": error,
        "updatedAt": now_iso(),
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


@app.post("/login/local")
def login_local_contract(payload: LocalLoginPayload, response: Response) -> dict[str, str]:
    user = find_user_by_username_or_email(payload.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    provided_password = payload.password or ""
    if not pwd_context.verify(provided_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = issue_access_token(user)
    set_auth_cookie(response, token)
    return {"token": token}


@app.post("/auth_upload")
def login_auth_upload(payload: AuthUploadPayload, response: Response) -> dict[str, str]:
    user = find_user_by_username_or_email(payload.username)
    if not user:
        user = next((item for item in USERS_DB if item["email"] == "maya@company.com"), USERS_DB[0])
    token = issue_access_token(user)
    set_auth_cookie(response, token)
    return {"token": token}


@app.get("/auth_check/{token}")
def auth_check_contract(request: Request, token: str, teams: list[str] | None = None) -> dict[str, bool]:
    user = validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    if is_admin_user(user):
        return build_team_access_map(all_known_teams())

    team_list = parse_team_list(request, teams)
    if not team_list:
        team_list = effective_user_teams(user)

    return build_team_access_map(team_list)


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
    teams = effective_user_teams(user)
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
    teams = effective_user_teams(user)
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
    teams = effective_user_teams(user)
    return {
        "user": user_public,
        "authMode": "cookie",
        "teams": teams,
        "permissions": permissions_for_teams(teams),
    }


@app.get("/auth/permissions")
def auth_permissions(request: Request, teams: list[str] | None = None) -> dict[str, Any]:
    user = current_user_from_request(request)
    if is_admin_user(user):
        team_list = all_known_teams()
    else:
        team_list = parse_team_list(request, teams)
        if not team_list and user:
            team_list = effective_user_teams(user)
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


@app.get("/download/vms")
def download_vms() -> dict[str, str]:
    return {"content": json.dumps(flatten_vms())}


@app.get("/download/datastores")
def download_datastores() -> dict[str, str]:
    return {"content": json.dumps(flatten_datastores())}


@app.get("/download/esx")
def download_esx() -> dict[str, str]:
    return {"content": json.dumps(flatten_esx_hosts())}


@app.get("/download/rdms")
def download_rdms() -> dict[str, str]:
    return {"content": json.dumps(flatten_rdms())}


@app.get("/vcenters")
def get_vcenters() -> list[str]:
    return get_vcenter_names()


@app.get("/vc_collector/get_vcs")
def get_vcs_contract() -> list[str]:
    return get_vcenter_names()


@app.get("/netapp/machines")
def get_netapp_machines() -> list[dict[str, str]]:
    return NETAPP_MACHINES


@app.get("/netapps")
def get_netapps_contract() -> list[str]:
    return [machine["name"] for machine in NETAPP_MACHINES]


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


@app.get("/vms/by-vc")
def vm_names_by_vc(vc: str | None = None) -> list[str]:
    return get_vm_names_by_vc(vc)


@app.get("/datastores/names")
def datastore_names() -> list[str]:
    return [item["name"] for item in flatten_datastores()]


@app.get("/datastores/by-vc-cluster")
def datastores_by_vc_cluster(vc: str | None = None, ds_cluster: str | None = None) -> list[str]:
    return get_datastore_names_by_vc_cluster(vc, ds_cluster)


@app.get("/rdm/names")
def rdm_names() -> list[str]:
    return [item["naa"] for item in flatten_rdms()]


@app.get("/rdms/by-vc-cluster")
def rdms_by_vc_cluster(vc: str | None = None, esx_cluster: str | None = None) -> list[str]:
    return get_rdm_naas_by_vc_cluster(vc, esx_cluster)


@app.get("/esx/names")
def esx_names() -> list[str]:
    return [item["name"] for item in flatten_esx_hosts()]


@app.get("/esx/by-vc-cluster")
def esx_by_vc_cluster(vc: str | None = None, esx_cluster: str | None = None) -> list[str]:
    return get_esx_names_by_vc_cluster(vc, esx_cluster)


@app.get("/volumes")
def volumes() -> list[str]:
    return [item["name"] for item in EXCH_VOLUMES]


def normalize_site(site: str | None) -> str:
    normalized = str(site or "").strip().lower()
    if normalized not in {"five", "nova"}:
        raise HTTPException(status_code=400, detail="Invalid site. Expected 'five' or 'nova'.")
    return normalized


@app.post("/lun/create")
def lun_create(site: str, payload: dict[str, Any]) -> dict[str, Any]:
    site_name = normalize_site(site)
    server_name = str(payload.get("server_name") or "").strip()
    db_names = [str(item).strip() for item in (payload.get("db_names") or []) if str(item).strip()]
    lun_size = payload.get("lun_size")
    return {
        "message": f"LUN create request accepted for {server_name or 'unknown server'} at {site_name}.",
        "site": site_name,
        "server_name": server_name,
        "db_names": db_names,
        "lun_size": lun_size,
        "status": "accepted",
    }


@app.put("/lun/expand")
def lun_expand(site: str, payload: dict[str, Any]) -> dict[str, Any]:
    site_name = normalize_site(site)
    serials = [str(item).strip() for item in (payload.get("serials") or []) if str(item).strip()]
    size_to_add = payload.get("size_to_add")
    return {
        "message": f"LUN expand request accepted for {len(serials)} serial(s) at {site_name}.",
        "site": site_name,
        "serials": serials,
        "size_to_add": size_to_add,
        "status": "accepted",
    }


@app.post("/lun/delete")
def lun_delete(site: str, payload: dict[str, Any]) -> dict[str, Any]:
    site_name = normalize_site(site)
    serials = [str(item).strip() for item in (payload.get("serials") or []) if str(item).strip()]
    return {
        "message": f"LUN delete request accepted for {len(serials)} serial(s) at {site_name}.",
        "site": site_name,
        "serials": serials,
        "status": "accepted",
    }


@app.get("/igroups")
def get_igroups(site: str) -> list[str]:
    site_name = normalize_site(site)
    if site_name == "nova":
        return ["NOVA_IGRP_DB01", "NOVA_IGRP_DB02", "NOVA_IGRP_EXCH01"]
    return ["FIVE_IGRP_DB01", "FIVE_IGRP_DB02", "FIVE_IGRP_EXCH01"]


@app.get("/aggregates")
def aggregates() -> list[str]:
    return ["AGG-01", "AGG-02", "AGG-03", "AGG-04", "AGG-05"]


@app.get("/ds-clusters/by-vc")
def ds_clusters_by_vc(vc: str | None = None) -> list[str]:
    return get_ds_clusters_for_vc(vc)


@app.get("/esx-clusters/by-vc")
def esx_clusters_by_vc(vc: str | None = None) -> list[str]:
    return get_esx_clusters_for_vc(vc)


@app.get("/clusters/by-vc")
def clusters_by_vc(vc: str | None = None) -> list[str]:
    if not vc:
        return []
    return sorted((INVENTORY.get(vc) or {}).keys())


@app.get("/network/{network}/vcenter/{vcenter}/clusters")
def network_clusters(network: str, vcenter: str) -> list[str]:
    _ = network
    return sorted((INVENTORY.get(vcenter) or {}).keys())


@app.get("/network/{network}/vcenter/{vcenter}/ds_clusters")
def network_ds_clusters(network: str, vcenter: str) -> list[str]:
    _ = network
    return get_ds_clusters_for_vc(vcenter)


@app.get("/network/{network}/vcenter/{vcenter}/datatores")
def network_datatores(network: str, vcenter: str) -> list[str]:
    _ = network
    return sorted(
        [
            item["name"]
            for item in flatten_datastores()
            if str(item.get("vc") or "") == vcenter and item.get("name")
        ]
    )


@app.get("/network/{network}/vcenter/{vcenter}/hosts")
def network_hosts(network: str, vcenter: str) -> list[str]:
    _ = network
    return sorted(
        [
            item["name"]
            for item in flatten_esx_hosts()
            if str(item.get("vc") or "") == vcenter and item.get("name")
        ]
    )


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
def job_status(jobId: str, stepsOnly: bool = True) -> dict[str, Any] | list[dict[str, str]]:
    job = JOBS_STORE.get(jobId)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {jobId} not found")

    if not job.get("firstStatusServed"):
        delay_ms = int(job.get("firstStatusDelayMs", 0))
        elapsed_ms = max(0, _utc_now_ms() - int(job.get("createdAtMs", _utc_now_ms())))
        wait_ms = max(0, delay_ms - elapsed_ms)
        if wait_ms > 0:
            time.sleep(wait_ms / 1000)
        job["firstStatusServed"] = True

    snapshot = _job_status_snapshot(job)
    if stepsOnly:
        return snapshot.get("steps", [])
    return snapshot


@app.get("/step_log")
def step_log(jobId: str) -> list[dict[str, str]]:
    job = JOBS_STORE.get(jobId)
    if job is None:
        return []
    snapshot = _job_status_snapshot(job)
    return snapshot.get("steps", [])


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


@app.get("/calculate-storage/netapp")
def calculate_storage_netapp(
    machineType: str = "NETAPP",
    size: float = 0,
    iops: float | None = None,
    replicas: float | None = None,
    srdf: bool | None = None,
) -> dict[str, Any]:
    payload = CalculatePayload(
        machineType=machineType or "NETAPP",
        size=size,
        iops=iops,
        replicas=replicas,
        srdf=srdf,
    )
    return price_calculate(payload)


@app.get("/calculate-storage/powermax")
def calculate_storage_powermax(
    machineType: str = "PMAX",
    size: float = 0,
    iops: float | None = None,
    replicas: float | None = None,
    srdf: bool | None = None,
) -> dict[str, Any]:
    payload = CalculatePayload(
        machineType=machineType or "PMAX",
        size=size,
        iops=iops,
        replicas=replicas,
        srdf=srdf,
    )
    return price_calculate(payload)


@app.get("/calculate-storage/powerflex")
def calculate_storage_powerflex(
    machineType: str = "PFLEX",
    size: float = 0,
    iops: float | None = None,
    replicas: float | None = None,
    srdf: bool | None = None,
) -> dict[str, Any]:
    payload = CalculatePayload(
        machineType=machineType or "PFLEX",
        size=size,
        iops=iops,
        replicas=replicas,
        srdf=srdf,
    )
    return price_calculate(payload)


@app.post("/refael/process-files")
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


@app.post("/process-excels")
def process_excels_contract(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
) -> dict[str, Any]:
    return process_files(file1=file1, file2=file2, note=None)


@app.get("/download-file")
def download_file_contract(fileName: str | None = None) -> Response:
    safe_file_name = str(fileName or f"result_{int(datetime.now().timestamp())}.txt").strip() or "result.txt"
    content = f"Generated file: {safe_file_name}\nGenerated at: {now_iso()}\n"
    return Response(
        content=content.encode("utf-8"),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_file_name}"'},
    )


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
    "/herzi/naa-ds-information": lambda q: (
        f"Input: {q}\nType: Datastore/NAA\nMapped DS: DS-TLV-FAST-01\nMapped NAA: naa.6000A0A1B2C30001\nSize: 500 GB\nStatus: Active"
    ),
    "/herzi/esx-pwwn": lambda q: (
        f"ESX: {q}\nPWWN-1: 10:00:00:90:fa:90:11:01\nPWWN-2: 10:00:00:90:fa:90:11:02\nPWWN-3: 10:00:00:90:fa:90:11:03"
    ),
    "/herzi/vm-information": lambda q: (
        f"VM: {q}\nPower: on\nvCenter: VC-TLV-01\nHost: ESX-TLV-01\nDatastore: DS-TLV-FAST-01\nIP: 10.10.0.21"
    ),
    "/herzi/unused-luns": lambda q: (
        f"vCenter: {q}\nUnused LUNs:\n1. lun_orphan_001\n2. lun_orphan_014\n3. lun_orphan_022"
    ),
    "/herzi/lun-volume-information": lambda q: (
        f"Object: {q}\nType: LUN/Volume\nArray: AFF-A400\nSVM: svm_prod_01\nSize: 1.2 TB\nUsed: 62%\nStatus: online"
    ),
    "/herzi/change-pwwn": lambda q: "".join(ch for ch in str(q) if ch.isalnum()),
}


HERZI_CONTRACT_HANDLERS = {
    "/unused_luns": HERZI_RESPONSES["/herzi/unused-luns"],
    "/vc_data_from_naa": HERZI_RESPONSES["/herzi/vc-info"],
    "/get_vm_or_ds_information": HERZI_RESPONSES["/herzi/vm-information"],
    "/naa_to_tdev": HERZI_RESPONSES["/herzi/naa-mapping"],
    "/convert_pwwn": HERZI_RESPONSES["/herzi/change-pwwn"],
    "/pwwn_to_esx": HERZI_RESPONSES["/herzi/esx-pwwn"],
    "/get_naa_information": HERZI_RESPONSES["/herzi/naa-lookup"],
    "/get_lun_or_vol_information": HERZI_RESPONSES["/herzi/lun-volume-information"],
}


def _run_herzi_contract_handler(request: Request) -> str | list[dict[str, str]]:
    handler = HERZI_CONTRACT_HANDLERS.get(request.url.path)
    if handler is None:
        return "No data found"

    inputs = parse_query_list(request, {"input", "input[]"})
    if not inputs:
        return "No data found"

    if len(inputs) == 1:
        return handler(inputs[0])
    return [{"item": item, "result": handler(item)} for item in inputs]


@app.get("/unused_luns")
@app.get("/vc_data_from_naa")
@app.get("/get_vm_or_ds_information")
@app.get("/naa_to_tdev")
@app.get("/convert_pwwn")
@app.get("/pwwn_to_esx")
@app.get("/get_naa_information")
@app.get("/get_lun_or_vol_information")
def herzi_contract_route(request: Request) -> str | list[dict[str, str]]:
    return _run_herzi_contract_handler(request)


@app.post("/herzi/{tool_name:path}")
def herzi_tools(tool_name: str, payload: HerziPayload) -> str | list[dict[str, str]]:
    endpoint = f"/herzi/{tool_name}"
    handler = HERZI_RESPONSES.get(endpoint)
    if handler is None:
        return "No data found"

    if isinstance(payload.input, list):
        items = [str(item).strip() for item in payload.input if str(item).strip()]
        return [{"item": item, "result": handler(item)} for item in items]

    query = str(payload.input).strip()
    if not query:
        return "No data found"
    return handler(query)


@app.post("/vc")
async def troubleshooter_vc(payload: TroubleshooterVCRequest) -> dict[str, Any]:
    vc_name = str(payload.vc_name or "").strip()
    if not vc_name:
        raise HTTPException(status_code=400, detail="vc_name is required.")

    await apply_troubleshooter_delay()

    vc_meta = VC_META.get(vc_name, {})
    clusters = sorted((INVENTORY.get(vc_name) or {}).keys())
    return {
        "mode": "vc",
        "vc_name": vc_name,
        "found": bool(vc_meta or clusters),
        "vcenter": vc_meta or None,
        "clusters": clusters,
        "clustersCount": len(clusters),
        "delayMs": TROUBLESHOOTER_DELAY_MS,
        "generatedAt": now_iso(),
    }


@app.post("/netapp")
async def troubleshooter_netapp(payload: TroubleshooterNetappRequest) -> dict[str, Any]:
    netapp_name = str(payload.netapp_name or "").strip()
    if not netapp_name:
        raise HTTPException(status_code=400, detail="netapp_name is required.")

    await apply_troubleshooter_delay()

    machine = find_netapp_machine(netapp_name)
    return {
        "mode": "netapp",
        "netapp_name": netapp_name,
        "found": bool(machine),
        "netapp": machine,
        "delayMs": TROUBLESHOOTER_DELAY_MS,
        "generatedAt": now_iso(),
    }


@app.post("/naas")
async def troubleshooter_naas(payload: TroubleshooterNaasRequest) -> dict[str, Any]:
    cleaned_naas = [str(item).strip() for item in (payload.naas or []) if str(item).strip()]
    if not cleaned_naas:
        raise HTTPException(status_code=400, detail="naas list is required.")

    await apply_troubleshooter_delay()

    rdms_by_naa = {
        str(item.get("naa") or ""): item
        for item in flatten_rdms()
        if str(item.get("naa") or "").strip()
    }
    results = []
    for naa in cleaned_naas:
        details = rdms_by_naa.get(naa)
        results.append(
            {
                "naa": naa,
                "found": bool(details),
                "details": details,
            }
        )

    found_count = sum(1 for item in results if item["found"])
    return {
        "mode": "naas",
        "naas": cleaned_naas,
        "results": results,
        "summary": {
            "total": len(results),
            "found": found_count,
            "missing": len(results) - found_count,
        },
        "delayMs": TROUBLESHOOTER_DELAY_MS,
        "generatedAt": now_iso(),
    }


@app.get("/multi_command")
def multi_command_contract(
    request: Request,
    user: str = "admin",
    password: str = "",
    command: str = "",
    hosts: list[str] | None = None,
) -> dict[str, str]:
    _ = password
    host_list = [str(host).strip() for host in (hosts or []) if str(host).strip()]
    if not host_list:
        host_list = parse_query_list(request, {"hosts", "hosts[]"})

    safe_user = str(user or "admin").strip() or "admin"
    safe_command = str(command or "version").strip() or "version"
    return {
        host: build_demo_output_text(safe_command, host, safe_user)
        for host in host_list
    }


@app.websocket("/ws/ssh")
async def ws_ssh_contract(websocket: WebSocket):
    await websocket.accept()
    session = {
        "connected": False,
        "host": "",
        "username": "",
    }
    try:
        while True:
            raw_message = await websocket.receive_text()
            message = str(raw_message or "").strip()

            if not message:
                await websocket.send_text("Empty message received.")
                continue

            if not session["connected"]:
                try:
                    payload = json.loads(message)
                except json.JSONDecodeError:
                    await websocket.send_text("First message must be JSON with host, username, password.")
                    continue

                if not isinstance(payload, dict):
                    await websocket.send_text("Invalid auth payload.")
                    continue

                host = str(payload.get("host") or "").strip()
                username = str(payload.get("username") or "").strip()
                password = str(payload.get("password") or "").strip()

                if not host or not username or not password:
                    await websocket.send_text("Missing host, username, or password.")
                    continue

                session["connected"] = True
                session["host"] = host
                session["username"] = username
                await websocket.send_text(f"Connected to {host} as {username}.")
                continue

            await asyncio.sleep(random.uniform(0.08, 0.2))
            await websocket.send_text(build_demo_output_text(message, session["host"], session["username"]))
    except WebSocketDisconnect:
        return


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


@app.post("/ansible/small_mds_builder")
def ansible_small_mds_builder(mdss: str = Form(...)) -> dict[str, Any]:
    try:
        parsed_mdss = json.loads(mdss)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid mdss payload: {exc.msg}") from exc

    if not isinstance(parsed_mdss, dict):
        raise HTTPException(status_code=400, detail="Invalid mdss payload: expected object.")

    required_sections = ["small_mds_a", "small_mds_b", "core_mds_a", "core_mds_b"]
    missing = [name for name in required_sections if name not in parsed_mdss]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing mdss section(s): {', '.join(missing)}")

    return {
        "status": "accepted",
        "message": "small_mds_builder request accepted",
        "mdss": parsed_mdss,
        "receivedAt": now_iso(),
    }


@app.post("/{path:path}")
def generic_actions(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _create_job(f"/{path}", payload)


@app.put("/{path:path}")
def generic_actions_put(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _create_job(f"/{path}", payload)


@app.patch("/{path:path}")
def generic_actions_patch(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _create_job(f"/{path}", payload)


@app.delete("/{path:path}")
def generic_actions_delete(path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return _create_job(f"/{path}", payload or {})

