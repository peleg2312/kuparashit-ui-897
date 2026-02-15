import { http, runApiRequest } from './client';

function tryParseJson(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().replace(/^\uFEFF/, '');
    if (!trimmed) return [];
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

function parseJsonPayload(rawData) {
    if (rawData == null) return [];

    if (typeof rawData === 'string') {
        const parsed = tryParseJson(rawData);
        return parsed === rawData ? [] : parsed;
    }

    if (typeof rawData === 'object' && rawData !== null) {
        const candidateKeys = ['content', 'data', 'items', 'rows', 'results', 'vms', 'datastores', 'esx', 'rdms'];
        for (const key of candidateKeys) {
            if (!Object.prototype.hasOwnProperty.call(rawData, key)) continue;
            const value = rawData[key];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                const parsed = tryParseJson(value);
                if (parsed !== value) return parsed;
            }
        }

        return rawData;
    }

    return rawData;
}

function asArrayResponse(value) {
    const normalizedValue = parseJsonPayload(value);

    if (Array.isArray(normalizedValue)) return normalizedValue;
    if (!normalizedValue || typeof normalizedValue !== 'object') return [];

    const arrayKeys = ['data', 'items', 'rows', 'results', 'vms', 'datastores', 'esx', 'rdms', 'content'];
    for (const key of arrayKeys) {
        const candidate = parseJsonPayload(normalizedValue[key]);
        if (Array.isArray(candidate)) return candidate;
    }

    const values = Object.values(normalizedValue).map((item) => parseJsonPayload(item));
    const hasOnlyObjectValues = values.length > 0 && values.every((item) => item && typeof item === 'object');
    if (hasOnlyObjectValues) return values;

    const firstArray = values.find((item) => Array.isArray(item));
    if (firstArray) return firstArray;

    return [];
}

function asUrlEncodedParams(params = {}) {
    const next = {};
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
            next[key] = value;
            return;
        }
        next[key] = value;
    });
    return next;
}

async function getJson(path, params = {}) {
    const response = await http.main.get(path, {
        params: asUrlEncodedParams(params),
        responseType: 'text',
    });
    return parseJsonPayload(response.data);
}

function shouldTryNextPath(error) {
    const status = error?.response?.status;
    return status === 404 || status === 405;
}

async function getJsonWithFallback(paths, params = {}) {
    let lastError = null;

    for (const path of paths) {
        try {
            return await getJson(path, params);
        } catch (error) {
            lastError = error;
            if (!shouldTryNextPath(error)) {
                throw error;
            }
        }
    }

    throw lastError || new Error('No backend path matched');
}

export const mainApi = {
    async getVMs() {
        return runApiRequest('main.getVMs', async () => asArrayResponse(
            await getJsonWithFallback(['/download/vms']),
        ));
    },
    async getDatastores() {
        return runApiRequest('main.getDatastores', async () => asArrayResponse(
            await getJsonWithFallback(['/download/datastores']),
        ));
    },
    async getESXHosts() {
        return runApiRequest('main.getESXHosts', async () => asArrayResponse(
            await getJsonWithFallback(['/download/esx']),
        ));
    },
    async getRDMs() {
        return runApiRequest('main.getRDMs', async () => asArrayResponse(
            await getJsonWithFallback(['/download/rdms']),
        ));
    },
    async getVCenters() {
        return runApiRequest('main.getVCenters', () => getJsonWithFallback(['/vc_collector/get_vcs']));
    },
    async getNetappMachines() {
        return runApiRequest('main.getNetappMachines', async () => asArrayResponse(
            await getJsonWithFallback(['/netapps']),
        ));
    },
    async getDropdownOptions(source, params = {}) {
        const normalizedSource = String(source || '').trim();

        if (normalizedSource.startsWith('/download/')) {
            return runApiRequest('main.getDropdownOptions', async () => asArrayResponse(
                await getJsonWithFallback([normalizedSource], params),
            ));
        }

        return runApiRequest('main.getDropdownOptions', async () => {
            const result = await getJsonWithFallback([normalizedSource], params);
            return asArrayResponse(result);
        });
    },
    async getJobStatus(jobId) {
        return runApiRequest('main.getJobStatus', () => getJsonWithFallback(
            ['/step_log'],
            { jobId },
        ));
    },
    async executeAction(endpoint, payload = {}) {
        return runApiRequest('main.executeAction', () => http.main.post(endpoint, payload));
    },
    async runMultiCommand({ user, password, command, hosts }) {
        return runApiRequest('main.runMultiCommand', () => http.main.get('/multi_command', {
            params: {
                user,
                password,
                command,
                hosts: Array.isArray(hosts) ? hosts : [],
            },
        }));
    },
};
