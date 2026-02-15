# ADFS Login UX Template (Auto-Start)

Goal: when the user chooses `ADFS`, start ADFS login immediately. No second confirm click.

## Target Behavior

- Local mode:
  - Shows username/password form
  - User clicks `Sign In` for local login
- ADFS mode:
  - As soon as user clicks/selects `ADFS`, trigger ADFS login flow
  - Do not show `Continue with ADFS` button
  - Show loading state while redirect/login starts

## Current Files to Change

- `src/pages/LoginPage/LoginPage.jsx`
- `src/contexts/AuthContext.jsx`
- `src/api/auth.js`
- Optional backend alignment in `backend/app.py` (if you standardize on `/auth/login/adfs`)

## Implementation Template (Pseudocode)

### 1) Add a single ADFS starter function

Template:

```text
function startAdfsLogin():
  if loading is true: return
  set loading true
  clear error
  call loginAdfs()
  navigate to "/"
  on error: show "ADFS sign-in failed"
  finally set loading false
```

### 2) Trigger ADFS on method switch

Template:

```text
onMethodChange(nextMethod):
  set method = nextMethod
  if nextMethod == "adfs":
    startAdfsLogin()
```

### 3) Remove confirm button in ADFS panel

Template:

```text
if method == "adfs":
  show informational text + spinner/loading message only
  no secondary submit button
```

### 4) Prevent duplicate trigger

Template:

```text
if loading == true:
  disable local/adfs toggle controls
  ignore additional clicks
```

### 5) Keep local login unchanged

Template:

```text
local submit handler remains as-is
only ADFS selection auto-triggers login
```

## API Contract Template for ADFS

Choose one stable endpoint and use it everywhere:

- Option A: `/auth/login/adfs` (recommended naming)
- Option B: `/auth_upload` (legacy/demo naming)

Template decision:

- [ ] Frontend `authApi.loginAdfs` calls the selected endpoint
- [ ] Backend supports the same endpoint in production
- [ ] Remove duplicate/legacy route once migration is complete

## UX States Template

- `idle-local`: local form visible
- `idle-adfs`: ADFS selected and login not yet triggered (should be brief)
- `loading-adfs`: redirect/auth in progress
- `error-adfs`: show retry text and allow reselect ADFS

## Acceptance Criteria

- [ ] Clicking `ADFS` immediately starts ADFS login
- [ ] No `Continue with ADFS` button remains
- [ ] Clicking `Local User` does not trigger ADFS
- [ ] Double-clicking ADFS does not send duplicate requests
- [ ] On failure, user sees error and can retry
- [ ] On success, user is routed to `/`

## Optional Improvements

- Support query-triggered login: `/login?mode=adfs` auto-starts ADFS.
- Add telemetry event: `auth_adfs_start`, `auth_adfs_success`, `auth_adfs_failure`.
- Add unit/integration test for method-switch auto-trigger behavior.
