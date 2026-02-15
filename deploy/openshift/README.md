# OpenShift Manifest Templates

Template files in this folder:

- `api-secret.yaml.template`
- `api-configmap.yaml.template`
- `api.yaml.template`
- `ui.yaml.template`

## Usage

1. Copy each `.template` file and remove the `.template` suffix.
2. Replace placeholders like `<registry>/<project>/...` and `<tag>`.
3. Apply in this order:

```bash
oc apply -f deploy/openshift/api-secret.yaml
oc apply -f deploy/openshift/api-configmap.yaml
oc apply -f deploy/openshift/api.yaml
oc apply -f deploy/openshift/ui.yaml
```

4. Verify:

```bash
oc get pods
oc get svc
oc get route
```

For complete deployment steps, use `docs/OPENSHIFT_DEPLOYMENT_TEMPLATE.md`.
