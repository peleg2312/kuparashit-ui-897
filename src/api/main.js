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

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    return trimmed.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return false;
    return ['true', '1', 'yes', 'y', 'on', 'connected'].includes(normalized);
}

function normalizeUrl(value) {
    const candidate = String(value || '').trim();
    return candidate || '';
}

function extractObjectPayload(rawData) {
    const parsed = parseJsonPayload(rawData);
    if (!isPlainObject(parsed)) return null;

    const wrapperKeys = ['content', 'data', 'items', 'rows', 'results', 'vms', 'datastores', 'esx', 'rdms'];
    for (const key of wrapperKeys) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        const candidate = parseJsonPayload(parsed[key]);
        if (isPlainObject(candidate)) return candidate;
    }

    return parsed;
}

function collectLeafNodes(node, path = [], acc = []) {
    if (!isPlainObject(node)) return acc;

    const values = Object.values(node);
    const hasNestedObject = values.some((value) => isPlainObject(value));

    if (!hasNestedObject) {
        acc.push({ path, value: node });
        return acc;
    }

    Object.entries(node).forEach(([key, value]) => {
        if (isPlainObject(value)) {
            collectLeafNodes(value, [...path, key], acc);
        }
    });

    return acc;
}

function normalizeRowLikeValue(row, kind) {
    if (!isPlainObject(row)) return null;

    const normalized = { ...row };
    normalized.url = normalizeUrl(normalized.url || normalized.href || normalized.link || normalized.web_url || normalized.webUrl);

    if (kind === 'ds') {
        normalized.name = String(normalized.name || '').trim();
        normalized.vc = String(normalized.vc || '').trim();
        normalized.ds_cluster = String(normalized.ds_cluster || normalized.cluster || normalized.dsCluster || '').trim();
        return normalized.name || normalized.vc || normalized.ds_cluster ? normalized : null;
    }

    if (kind === 'esx') {
        normalized.name = String(normalized.name || '').trim();
        normalized.vc = String(normalized.vc || '').trim();
        normalized.esx_cluster = String(normalized.esx_cluster || normalized.cluster || normalized.esxCluster || '').trim();
        normalized.pwwns = parseList(normalized.pwwns || normalized.pwwn || normalized.wwns);
        return normalized.name || normalized.vc || normalized.esx_cluster ? normalized : null;
    }

    if (kind === 'rdm') {
        normalized.naa = String(normalized.naa || '').trim();
        normalized.vc = String(normalized.vc || '').trim();
        normalized.esx_cluster = String(normalized.esx_cluster || normalized.cluster || normalized.esxCluster || '').trim();
        normalized.connected = parseBoolean(normalized.connected);
        return normalized.naa || normalized.vc || normalized.esx_cluster ? normalized : null;
    }

    if (kind === 'vms') {
        normalized.name = String(normalized.name || '').trim();
        normalized.vc = String(normalized.vc || '').trim();
        normalized.datastore = String(normalized.datastore || normalized.ds || '').trim();
        normalized.naas_of_rdms = parseList(
            normalized.naas_of_rdms || normalized.naas || normalized.rdm_naas || normalized.naa || normalized.naa_list,
        );
        return normalized.name || normalized.vc || normalized.datastore ? normalized : null;
    }

    return normalized;
}

function mapLeafToRow(kind, vcKey, objectKey, clusterKey, leafValue) {
    if (!isPlainObject(leafValue)) return null;

    const source = { ...leafValue };
    const shared = {
        ...source,
        id: source.id || `${kind}::${vcKey}::${objectKey}`,
        vc: String(source.vc || vcKey || '').trim(),
        url: normalizeUrl(source.url || source.href || source.link || source.web_url || source.webUrl),
    };

    if (kind === 'ds') {
        return normalizeRowLikeValue({
            ...shared,
            name: String(source.name || objectKey || '').trim(),
            ds_cluster: String(source.ds_cluster || source.cluster || source.dsCluster || clusterKey || '').trim(),
            size: source.size ?? source.size_gb ?? source.sizeGb ?? null,
        }, 'ds');
    }

    if (kind === 'esx') {
        return normalizeRowLikeValue({
            ...shared,
            name: String(source.name || objectKey || '').trim(),
            esx_cluster: String(source.esx_cluster || source.cluster || source.esxCluster || clusterKey || '').trim(),
            pwwns: source.pwwns ?? source.pwwn ?? source.wwns ?? [],
        }, 'esx');
    }

    if (kind === 'rdm') {
        return normalizeRowLikeValue({
            ...shared,
            naa: String(source.naa || objectKey || '').trim(),
            esx_cluster: String(source.esx_cluster || source.cluster || source.esxCluster || clusterKey || '').trim(),
            size: source.size ?? source.size_gb ?? source.sizeGb ?? null,
            connected: source.connected,
        }, 'rdm');
    }

    if (kind === 'vms') {
        return normalizeRowLikeValue({
            ...shared,
            name: String(source.name || objectKey || '').trim(),
            datastore: String(source.datastore || source.ds || '').trim(),
            naas_of_rdms: source.naas_of_rdms ?? source.naas ?? source.rdm_naas ?? source.naa ?? source.naa_list ?? [],
        }, 'vms');
    }

    return null;
}

function asRowsFromNestedMap(rawData, kind) {
    const payload = extractObjectPayload(rawData);
    if (!payload) return [];

    const rows = [];
    const leaves = collectLeafNodes(payload);

    leaves.forEach(({ path, value }) => {
        if (!Array.isArray(path) || path.length < 2) return;

        const vcKey = String(path[0] || '').trim();
        const objectKey = String(path[path.length - 1] || '').trim();
        const clusterKey = path.length >= 3 ? String(path[path.length - 2] || '').trim() : '';
        if (!vcKey || !objectKey) return;

        const row = mapLeafToRow(kind, vcKey, objectKey, clusterKey, value);
        if (row) rows.push(row);
    });

    return rows;
}

function normalizeTableRows(rawData, kind) {
    const nestedRows = asRowsFromNestedMap(rawData, kind);
    if (nestedRows.length > 0) return nestedRows;

    const arrayRows = asArrayResponse(rawData);
    if (!Array.isArray(arrayRows)) return [];

    return arrayRows
        .map((row) => normalizeRowLikeValue(row, kind))
        .filter(Boolean);
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
        return runApiRequest('main.getVMs', async () => {
            const raw = await getJsonWithFallback(['/download/vms']);
            return normalizeTableRows(raw, 'vms');
        });
    },
    async getDatastores() {
        return runApiRequest('main.getDatastores', async () => {
            const raw = await getJsonWithFallback(['/download/ds']);
            return normalizeTableRows(raw, 'ds');
        });
    },
    async getESXHosts() {
        return runApiRequest('main.getESXHosts', async () => {
            const raw = await getJsonWithFallback(['/download/esx']);
            return normalizeTableRows(raw, 'esx');
        });
    },
    async getRDMs() {
        return runApiRequest('main.getRDMs', async () => {
            const raw = await getJsonWithFallback(['/download/rdm']);
            return normalizeTableRows(raw, 'rdm');
        });
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
    async executeSmallMdsBuilder(payload = {}) {
        return runApiRequest('main.executeSmallMdsBuilder', () => {
            const formData = new FormData();
            formData.append('mdss', JSON.stringify(payload?.mdss || {}));
            return http.main.post('/ansible/small_mds_builder', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        });
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
