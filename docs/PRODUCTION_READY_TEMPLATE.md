# Production Readiness Template

Use this checklist as a template for moving this project from demo to production.

## P0 - Must Complete Before Exposure

- [ ] Replace all demo/mock data from `backend/app.py` with real data sources.
- [ ] Remove hardcoded demo users and default credentials.
- [ ] Force `JWT_SECRET` from secret manager. Do not allow fallback defaults.
- [ ] Set secure cookies in production:
  - [ ] `COOKIE_SECURE=true`
  - [ ] Correct `COOKIE_DOMAIN`
  - [ ] `SameSite` policy reviewed for ADFS redirect flow
- [ ] Restrict CORS to real domains only (remove localhost defaults in production).
- [ ] Add real ADFS integration flow (OIDC/SAML), remove mock `/auth_upload` behavior.
- [ ] Add backend rate limiting and login protection (lockout, throttling).
- [ ] Validate all inputs with strict schemas and error handling.

## P1 - Must Complete Before First Production Release

- [ ] Split backend into modules (auth, inventory, tools, websocket, config) instead of one large file.
- [ ] Add centralized structured logging (JSON logs with request id/user id).
- [ ] Add health and readiness checks aligned with dependencies.
- [ ] Add backend tests:
  - [ ] auth tests
  - [ ] permissions tests
  - [ ] critical API endpoint tests
- [ ] Add frontend tests:
  - [ ] login flow tests
  - [ ] route protection tests
  - [ ] API contract tests for auth and permissions
- [ ] Add CI gates:
  - [ ] lint
  - [ ] unit tests
  - [ ] build
  - [ ] container image scan
- [ ] Pin runtime versions and dependency update policy.
- [ ] Implement proper `/auth/logout` behavior server-side.

## P2 - Operational Hardening

- [ ] Add observability stack:
  - [ ] metrics
  - [ ] log aggregation
  - [ ] alerting
- [ ] Add audit logging for privileged actions.
- [ ] Add backup/restore and DR plan for stateful dependencies.
- [ ] Add SLOs and incident runbooks.
- [ ] Add release strategy (canary/blue-green) and rollback process.

## Environment Template

Use this as your production environment variable checklist:

- [ ] `JWT_SECRET=<from OpenShift Secret>`
- [ ] `ACCESS_TOKEN_TTL_MIN=<value>`
- [ ] `ACCESS_COOKIE_NAME=<value>`
- [ ] `COOKIE_SECURE=true`
- [ ] `COOKIE_DOMAIN=<your-domain>`
- [ ] `TROUBLESHOOTER_DELAY_MS=0` (or production value)
- [ ] `VITE_MAIN_API_BASE_URL=https://<api-route>`
- [ ] `VITE_KPR_API_BASE_URL=https://<api-route>`
- [ ] `VITE_EXCH_API_BASE_URL=https://<api-route>`
- [ ] `VITE_TROUBLESHOOTER_API_BASE_URL=https://<api-route>`
- [ ] `VITE_API_TIMEOUT_MS=<value>`
- [ ] `VITE_TROUBLESHOOTER_TIMEOUT_MS=<value>`
