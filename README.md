# Kupa Rashit UI + FastAPI

This repository includes:
- React UI (Vite) in `src/`
- FastAPI backend in `backend/app.py`
- Local development via `docker-compose.yml`

Important: the current app is demo-oriented and not production-hardened yet.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set MONGO_URI=mongodb://127.0.0.1:27017
set MONGO_DB_NAME=kupa_rashit
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### Frontend

```bash
npm ci
copy .env.example .env
npm run dev
```

Open `http://127.0.0.1:5173`.

Demo users:
- `admin / admin123`
- `sarah / sarah123`
- `john / john123`
- `maya / maya123`

### Docker Compose (Dev)

```bash
docker compose up --build
```

This now starts:
- `api` on `http://127.0.0.1:8000`
- `ui` on `http://127.0.0.1:5173`
- `mongo` on `mongodb://127.0.0.1:27017`

### Dashy

- New screen: `/dashy`
- Team scoped data in MongoDB
- One metadata collection: `catalog_type_definitions`
- One object collection per team+type (`catalog__{team}__{type}`)
- `name` is required and unique per type; `url` is optional
- Dynamic schema fields per type with field-level hide-only removal

## Production Templates

Use these templates before deploying:

- Production hardening checklist: `docs/PRODUCTION_READY_TEMPLATE.md`
- OpenShift deployment guide + manifest templates: `docs/OPENSHIFT_DEPLOYMENT_TEMPLATE.md`
- OpenShift ready-to-fill YAML templates: `deploy/openshift/README.md`
- ADFS login UX template (auto-start on ADFS selection): `docs/ADFS_LOGIN_TEMPLATE.md`
