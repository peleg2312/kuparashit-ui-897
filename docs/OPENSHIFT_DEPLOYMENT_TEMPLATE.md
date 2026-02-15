# OpenShift Deployment Template

This is a template you can adapt for deploying this project to OpenShift.

## 1. Prerequisites

- OpenShift CLI installed (`oc`)
- Access to an OpenShift cluster and project/namespace
- Container registry access
- TLS domain for routes

Login:

```bash
oc login https://api.<cluster-domain>:6443
oc project <your-namespace>
```

## 2. Container Strategy

Recommended:

- API image: build from `backend/Dockerfile`
- UI image: build static Vite assets and serve with nginx (or similar)

Current `docker-compose.yml` is development oriented (`npm run dev`) and should not be used as-is in production.

## 3. Required Secrets and Config

Create backend secret:

```bash
oc create secret generic kupa-api-secret \
  --from-literal=JWT_SECRET='<strong-random-secret>' \
  --from-literal=COOKIE_DOMAIN='<your-domain>'
```

Create backend config map:

```bash
oc create configmap kupa-api-config \
  --from-literal=ACCESS_TOKEN_TTL_MIN='60' \
  --from-literal=ACCESS_COOKIE_NAME='access_token' \
  --from-literal=COOKIE_SECURE='true' \
  --from-literal=TROUBLESHOOTER_DELAY_MS='0'
```

UI config is build-time (`VITE_*`). Inject values during the UI image build.

## 4. API Deployment Template

Save as `deploy/openshift/api.yaml` and replace placeholders:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kupa-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kupa-api
  template:
    metadata:
      labels:
        app: kupa-api
    spec:
      containers:
      - name: api
        image: <registry>/<project>/kupa-api:<tag>
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: kupa-api-config
        - secretRef:
            name: kupa-api-secret
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 20
          periodSeconds: 20
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: kupa-api
spec:
  selector:
    app: kupa-api
  ports:
  - name: http
    port: 80
    targetPort: 8000
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: kupa-api
spec:
  to:
    kind: Service
    name: kupa-api
  port:
    targetPort: http
  tls:
    termination: edge
```

Apply:

```bash
oc apply -f deploy/openshift/api.yaml
```

## 5. UI Deployment Template

Save as `deploy/openshift/ui.yaml` and replace placeholders:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kupa-ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kupa-ui
  template:
    metadata:
      labels:
        app: kupa-ui
    spec:
      containers:
      - name: ui
        image: <registry>/<project>/kupa-ui:<tag>
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "50m"
            memory: "128Mi"
          limits:
            cpu: "300m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: kupa-ui
spec:
  selector:
    app: kupa-ui
  ports:
  - name: http
    port: 80
    targetPort: 8080
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: kupa-ui
spec:
  to:
    kind: Service
    name: kupa-ui
  port:
    targetPort: http
  tls:
    termination: edge
```

Apply:

```bash
oc apply -f deploy/openshift/ui.yaml
```

## 6. Build and Push Template

Build API image:

```bash
docker build -t <registry>/<project>/kupa-api:<tag> backend
docker push <registry>/<project>/kupa-api:<tag>
```

Build UI image (example with build args):

```bash
docker build -t <registry>/<project>/kupa-ui:<tag> . \
  --build-arg VITE_MAIN_API_BASE_URL=https://<api-route> \
  --build-arg VITE_KPR_API_BASE_URL=https://<api-route> \
  --build-arg VITE_EXCH_API_BASE_URL=https://<api-route> \
  --build-arg VITE_TROUBLESHOOTER_API_BASE_URL=https://<api-route>
docker push <registry>/<project>/kupa-ui:<tag>
```

## 7. Post-Deploy Validation Template

- [ ] `oc get pods` shows all pods running and ready
- [ ] API route `GET /health` returns `200`
- [ ] UI route loads successfully
- [ ] Local login works in production config
- [ ] ADFS login redirect works end-to-end
- [ ] Protected routes enforce permissions correctly
- [ ] Browser console has no auth/CORS errors
