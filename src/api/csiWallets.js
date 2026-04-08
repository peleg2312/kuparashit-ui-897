import { http, runApiRequest } from './client';

function tryParseJson(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().replace(/^\uFEFF/, '');
    if (!trimmed) return value;

    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeValue(value) {
    const parsed = tryParseJson(value);

    if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeValue(item));
    }

    if (isPlainObject(parsed)) {
        return Object.entries(parsed).reduce((acc, [key, entryValue]) => {
            acc[key] = normalizeValue(entryValue);
            return acc;
        }, {});
    }

    return parsed;
}

function uniqueStrings(values = []) {
    return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];
}

function extractOptionStrings(item) {
    const normalizedItem = normalizeValue(item);

    if (normalizedItem == null) return [];
    if (typeof normalizedItem === 'string' || typeof normalizedItem === 'number') {
        return [String(normalizedItem).trim()];
    }

    if (!isPlainObject(normalizedItem)) return [];

    const preferredKeys = [
        'name',
        'label',
        'value',
        'id',
        'openshift',
        'storage_class',
        'storageClass',
        'pflex_server',
        'pflexServer',
        'server',
        'host',
    ];

    for (const key of preferredKeys) {
        const candidate = normalizedItem[key];
        if (typeof candidate === 'string' || typeof candidate === 'number') {
            return [String(candidate).trim()];
        }
    }

    const primitiveValues = Object.values(normalizedItem)
        .filter((value) => typeof value === 'string' || typeof value === 'number')
        .map((value) => String(value).trim())
        .filter(Boolean);

    return primitiveValues.length === 1 ? primitiveValues : [];
}

function asOptionList(value) {
    const normalizedValue = normalizeValue(value);

    if (Array.isArray(normalizedValue)) {
        return uniqueStrings(normalizedValue.flatMap((item) => extractOptionStrings(item)));
    }

    if (!isPlainObject(normalizedValue)) return [];

    const wrappedKeys = [
        'data',
        'items',
        'rows',
        'results',
        'content',
        'storage_classes',
        'storageClasses',
        'openshifts',
        'pflexs',
        'pflex_servers',
        'servers',
    ];

    for (const key of wrappedKeys) {
        if (!Object.prototype.hasOwnProperty.call(normalizedValue, key)) continue;
        const nestedList = asOptionList(normalizedValue[key]);
        if (nestedList.length) return nestedList;
    }

    const valueBasedOptions = uniqueStrings(
        Object.values(normalizedValue).flatMap((item) => extractOptionStrings(item)),
    );
    if (valueBasedOptions.length) return valueBasedOptions;

    return uniqueStrings(Object.keys(normalizedValue));
}

function asResultObject(value) {
    const normalizedValue = normalizeValue(value);

    if (isPlainObject(normalizedValue) || Array.isArray(normalizedValue)) {
        return normalizedValue;
    }

    return { value: normalizedValue };
}

function withParams(params = {}) {
    return Object.entries(params).reduce((acc, [key, value]) => {
        if (value == null || value === '') return acc;
        acc[key] = value;
        return acc;
    }, {});
}

async function getOptions(path, params = {}) {
    return runApiRequest(`csiWallets.getOptions:${path}`, async () => {
        const response = await http.csiWallets.get(path, { params: withParams(params) });
        return asOptionList(response.data);
    });
}

async function getResult(path, params = {}) {
    return runApiRequest(`csiWallets.getResult:${path}`, async () => {
        const response = await http.csiWallets.get(path, { params: withParams(params) });
        return asResultObject(response.data);
    });
}

export const csiWalletsApi = {
    async getStorageClasses(openshift = '') {
        return getOptions('/storage_classes', { openshift: String(openshift || '').trim() });
    },

    async getOpenshifts() {
        return getOptions('/openshift');
    },

    async getPflexServers() {
        return getOptions('/pflexs');
    },

    async checkPflexAllocation({ sizeInTb, pflexServer } = {}) {
        return getResult('/check-pflex-allocation', {
            size_in_tb: String(sizeInTb || '').trim(),
            pflex_server: String(pflexServer || '').trim(),
        });
    },

    async checkOcpAllocation({ openshift } = {}) {
        return getResult('/check-ocp-allocation', {
            openshift: String(openshift || '').trim(),
        });
    },

    async checkStorageClass({ openshift, storageClass } = {}) {
        return getResult('/storage_class_check', {
            openshift: String(openshift || '').trim(),
            storage_class: String(storageClass || '').trim(),
        });
    },

    async checkAllStorageClasses({ openshift } = {}) {
        return getResult('/check_all_sc_ocp', {
            openshift: String(openshift || '').trim(),
        });
    },
};
