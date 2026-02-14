# Kupa Rashit UI + FastAPI Demo

This project now includes:
- React UI (Vite)
- FastAPI backend (`backend/app.py`)
- Production-like Docker compose for demo

## 1) Local run (recommended for development)

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Optional production-like auth env vars:

```bash
set JWT_SECRET=replace-with-strong-secret
set ACCESS_TOKEN_TTL_MIN=60
set COOKIE_SECURE=false
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### Frontend (Vite)

```bash
npm ci
copy .env.example .env
npm run dev
```

Open `http://127.0.0.1:5173`.

Local demo users:
- `admin / admin123`
- `sarah / sarah123`
- `john / john123`
- `maya / maya123`

## 2) Production-like demo with Docker

```bash
docker compose up --build
```

This starts:
- API on `http://127.0.0.1:8000`
- UI on `http://127.0.0.1:5173`

## API notes

The backend includes all routes currently used by the frontend:
- Auth: `/auth/login/local`, `/auth/login/adfs`, `/auth/session`, `/auth/permissions`, `/auth/logout`
- Data: `/vms`, `/datastores`, `/esx-hosts`, `/rdms`, `/vcenters`, `/exch/volumes`, `/qtrees`, `/users`
- Dropdowns: `/vms/names`, `/datastores/names`, `/rdm/names`, `/esx/names`, `/volumes`, `/aggregates`, `/clusters/by-vc`, `/esx/by-cluster`
- Tools: `/price/calculate`, `/refhael/process-files`, `/herzi/*`
- Actions: generic POST endpoint that returns job tracking payload for action modals

## Frontend API config

`src/api/config.js` now defaults all API clients (`main`, `kpr`, `exch`) to one backend base URL (`http://127.0.0.1:8000`) unless overridden via env vars.
