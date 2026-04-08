import { csiWalletsApi } from '@/api';

export function tryParseJson(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().replace(/^\uFEFF/, '');
    if (!trimmed) return value;
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

export function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizePayload(value) {
    const parsed = tryParseJson(value);
    if (Array.isArray(parsed)) return parsed.map(normalizePayload);
    if (!isPlainObject(parsed)) return parsed;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, normalizePayload(item)]));
}

export function formatLabel(value) {
    return String(value || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatPrimitive(value) {
    if (value == null || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

export function normalizeOptions(options = []) {
    return (Array.isArray(options) ? options : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean);
}

export function getPayloadMeta(value) {
    if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
    if (isPlainObject(value)) {
        const size = Object.keys(value).length;
        return `${size} ${size === 1 ? 'key' : 'keys'}`;
    }
    return '1 value';
}

export const FIELD_CONFIG = {
    openshift: {
        label: 'OpenShift',
        emptyLabel: 'Select OpenShift',
        type: 'select',
    },
    storageClass: {
        label: 'Storage Class',
        emptyLabel: 'Select Storage Class',
        loadingHelp: 'Refreshing storage classes for the selected OpenShift...',
        type: 'select',
    },
    pflexServer: {
        label: 'PowerFlex Server',
        emptyLabel: 'Select PowerFlex Server',
        type: 'select',
    },
    sizeInTb: {
        label: 'Size In TB',
        min: '0',
        placeholder: 'e.g. 6',
        step: '0.1',
        type: 'number',
    },
};

export async function resolveStorageClasses(openshift = '') {
    const safeOpenshift = String(openshift || '').trim();
    try {
        const globalOptions = await csiWalletsApi.getStorageClasses();
        if (globalOptions.length) return { mode: 'global', options: globalOptions };
    } catch (error) {
        if (!safeOpenshift) throw error;
    }
    if (!safeOpenshift) return { mode: 'global', options: [] };
    return { mode: 'scoped', options: await csiWalletsApi.getStorageClasses(safeOpenshift) };
}

export async function buildSources(preferred = {}) {
    const [openshifts, pflexServers] = await Promise.all([
        csiWalletsApi.getOpenshifts(),
        csiWalletsApi.getPflexServers(),
    ]);
    const nextOpenshift = openshifts.includes(preferred.openshift) ? preferred.openshift : (openshifts[0] || '');
    const storage = await resolveStorageClasses(nextOpenshift);
    return {
        options: {
            openshifts,
            pflexServers,
            storageClasses: storage.options,
        },
        selection: {
            openshift: nextOpenshift,
            pflexServer: pflexServers.includes(preferred.pflexServer) ? preferred.pflexServer : (pflexServers[0] || ''),
            storageClass: storage.options.includes(preferred.storageClass) ? preferred.storageClass : (storage.options[0] || ''),
        },
        storageClassMode: storage.mode,
    };
}

export async function refreshScopedStorageClasses(openshift = '', preferredStorageClass = '') {
    const options = openshift ? await csiWalletsApi.getStorageClasses(openshift) : [];
    return {
        options,
        selected: options.includes(preferredStorageClass) ? preferredStorageClass : (options[0] || ''),
    };
}
