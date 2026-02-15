import { http, runApiRequest } from './client';

function normalizeMethod(method = 'post') {
    return String(method || 'post').trim().toLowerCase();
}

function withSiteParams(params = {}, site = '') {
    if (!site) return params;
    return { ...params, site };
}

function asArrayResponse(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    const keys = ['data', 'items', 'rows', 'results', 'content', 'igroups'];
    for (const key of keys) {
        if (Array.isArray(value[key])) return value[key];
    }
    const values = Object.values(value);
    const allObjects = values.length > 0 && values.every((item) => item && typeof item === 'object');
    return allObjects ? values : [];
}

export const exchApi = {
    async executeAction(endpoint, payload = {}, options = {}) {
        const method = normalizeMethod(options.method);
        const site = options.site || payload.site || '';

        if (method === 'put') {
            return runApiRequest('exch.executeAction', () => http.exch.put(endpoint, payload, {
                params: withSiteParams({}, site),
            }));
        }

        if (method === 'delete') {
            return runApiRequest('exch.executeAction', () => http.exch.delete(endpoint, {
                params: withSiteParams({}, site),
                data: payload,
            }));
        }

        return runApiRequest('exch.executeAction', () => http.exch.post(endpoint, payload, {
            params: withSiteParams({}, site),
        }));
    },

    async getDropdownOptions(source, params = {}) {
        return runApiRequest('exch.getDropdownOptions', async () => {
            const response = await http.exch.get(source, { params });
            return asArrayResponse(response.data);
        });
    },

    async getIgroups(site) {
        return runApiRequest('exch.getIgroups', async () => {
            const response = await http.exch.get('/igroups', { params: withSiteParams({}, site) });
            return asArrayResponse(response.data);
        });
    },
};
