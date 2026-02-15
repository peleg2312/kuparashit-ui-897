import { http, runApiRequest } from './client';

function normalizeMethod(method = 'post') {
    return String(method || 'post').trim().toLowerCase();
}

function withNetworkParams(params = {}, network = '') {
    if (!network) return params;
    return { ...params, network };
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

        if (method === 'delete') {
            return runApiRequest('kpr.executeAction', () => http.kpr.delete(endpoint, {
                params: withNetworkParams({}, network),
                data: payload,
            }));
        }

        if (method === 'put') {
            return runApiRequest('kpr.executeAction', () => http.kpr.put(endpoint, payload, {
                params: withNetworkParams({}, network),
            }));
        }

        if (method === 'patch') {
            return runApiRequest('kpr.executeAction', () => http.kpr.patch(endpoint, payload, {
                params: withNetworkParams({}, network),
            }));
        }

        return runApiRequest('kpr.executeAction', () => http.kpr.post(endpoint, payload, {
            params: withNetworkParams({}, network),
        }));
    },

    async getDropdownOptions(source, params = {}) {
        return runApiRequest('kpr.getDropdownOptions', async () => {
            const response = await http.kpr.get(source, { params });
            return asArrayResponse(response.data);
        });
    },
};
