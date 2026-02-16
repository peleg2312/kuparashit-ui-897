import { http, runApiRequest } from './client';

function normalizeMethod(method = 'post') {
    return String(method || 'post').trim().toLowerCase();
}

function withKprParams(params = {}, options = {}) {
    const next = { ...params };
    const network = String(options.network || '').trim();
    const vcName = String(options.vcName || '').trim();

    if (network) next.network = network;
    if (vcName) next.vc_name = vcName;

    return next;
}

function buildJobId() {
    const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    if (hasCrypto) return crypto.randomUUID();
    return `job-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeActionPayload(payload = {}) {
    const next = { ...payload };
    delete next.network;
    delete next.vc;
    delete next.vcenter;
    delete next.vc_name;
    delete next.clusterType;
    delete next.original_esx_cluster;

    if (!next.job_id) {
        next.job_id = buildJobId();
    }

    if (Object.prototype.hasOwnProperty.call(next, 'set_quota')
        && !next.set_quota
        && (next.size_in_mb === '' || next.size_in_mb == null)) {
        next.size_in_mb = 0;
    }

    return next;
}

function asArrayResponse(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    const keys = ['data', 'items', 'rows', 'results', 'content'];
    for (const key of keys) {
        if (Array.isArray(value[key])) return value[key];
    }
    const values = Object.values(value);
    const allObjects = values.length > 0 && values.every((item) => item && typeof item === 'object');
    return allObjects ? values : [];
}

export const kprApi = {
    async executeAction(endpoint, payload = {}, options = {}) {
        const method = normalizeMethod(options.method);
        const network = options.network || payload.network || '';
        const vcName = options.vcName || options.vc_name || payload.vc_name || payload.vc || payload.vcenter || '';
        const body = sanitizeActionPayload(payload);
        const params = withKprParams({}, { network, vcName });
        let response;

        if (method === 'delete') {
            response = await runApiRequest('kpr.executeAction', () => http.kpr.delete(endpoint, {
                params,
                data: body,
            }));
        } else if (method === 'put') {
            response = await runApiRequest('kpr.executeAction', () => http.kpr.put(endpoint, body, {
                params,
            }));
        } else if (method === 'patch') {
            response = await runApiRequest('kpr.executeAction', () => http.kpr.patch(endpoint, body, {
                params,
            }));
        } else {
            response = await runApiRequest('kpr.executeAction', () => http.kpr.post(endpoint, body, {
                params,
            }));
        }

        if (response && typeof response === 'object' && !response.jobId && body.job_id) {
            return { ...response, jobId: body.job_id };
        }

        return response;
    },

    async getDropdownOptions(source, params = {}) {
        return runApiRequest('kpr.getDropdownOptions', async () => {
            const response = await http.kpr.get(source, { params });
            return asArrayResponse(response.data);
        });
    },
};
