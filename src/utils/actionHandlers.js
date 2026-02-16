import { HiPlus, HiTrash, HiViewGrid, HiCube, HiServer } from 'react-icons/hi';
import { exchApi, kprApi, mainApi } from '../api';

export const actionIconMap = {
    create: HiPlus,
    delete: HiTrash,
    createCluster: HiViewGrid,
    createClusterNetapp: HiViewGrid,
    createClusterVmax: HiViewGrid,
    createClusterPflex: HiViewGrid,
    extend: HiCube,
    default: HiServer,
};

export const actionButtonStyleMap = {
    create: 'btn-primary',
    delete: 'btn-danger',
    createCluster: 'btn-secondary',
    createClusterNetapp: 'btn-secondary',
    createClusterVmax: 'btn-secondary',
    createClusterPflex: 'btn-secondary',
    extend: 'btn-secondary',
};

export const actionCardColorMap = {
    create: 'var(--accent)',
    delete: 'var(--error)',
    createCluster: 'var(--info)',
    createClusterNetapp: 'var(--info)',
    createClusterVmax: 'var(--warning)',
    createClusterPflex: 'var(--success)',
    extend: 'var(--warning)',
    default: 'var(--text-secondary)',
};

const apiByName = {
    main: mainApi,
    kpr: kprApi,
    exch: exchApi,
};

export function resolveActionApi(action, apiService) {
    return apiByName[action?.api] || apiService || kprApi;
}

export function resolveActionEndpoint(action, values = {}) {
    if (!action) return '';
    const selectorField = action.endpointSelector;
    const endpointMap = action.endpointByValue;
    if (selectorField && endpointMap && typeof endpointMap === 'object') {
        const selectorValue = values?.[selectorField];
        if (selectorValue && endpointMap[selectorValue]) {
            return endpointMap[selectorValue];
        }
    }
    return action.endpoint;
}

function parseListValue(value) {
    if (Array.isArray(value)) return value;
    const text = String(value || '').trim();
    if (!text) return [];
    return [...new Set(
        text
            .split(/[,\n\s]+/g)
            .map((item) => item.trim())
            .filter(Boolean),
    )];
}

function isParamVisibleForPayload(param, values) {
    const rule = param?.visibleWhen;
    if (!rule) return true;

    if (rule.field) {
        const currentValue = values?.[rule.field];
        if (Object.prototype.hasOwnProperty.call(rule, 'equals')) {
            return currentValue === rule.equals;
        }
        if (Array.isArray(rule.in)) {
            return rule.in.includes(currentValue);
        }
    }

    if (typeof rule === 'object') {
        return Object.entries(rule).every(([field, expected]) => {
            if (field === 'field' || field === 'equals' || field === 'in') return true;
            const currentValue = values?.[field];
            return Array.isArray(expected) ? expected.includes(currentValue) : currentValue === expected;
        });
    }

    return true;
}

export function normalizeActionPayload(action, values = {}, extraPayload = {}) {
    const payload = { ...values, ...extraPayload };
    if (!action) return payload;

    const listFieldSet = new Set(action.listFields || []);
    const paramByName = new Map((action.params || []).map((param) => [param.name, param]));
    const visibilitySource = { ...payload };

    Object.keys(payload).forEach((key) => {
        const param = paramByName.get(key);
        const value = payload[key];

        if (param && !isParamVisibleForPayload(param, visibilitySource)) {
            delete payload[key];
            return;
        }

        if (param?.send === false) {
            delete payload[key];
            return;
        }

        if (listFieldSet.has(key)) {
            payload[key] = parseListValue(value);
            return;
        }

        if (param?.multi && !Array.isArray(value)) {
            payload[key] = parseListValue(value);
            return;
        }

        if (param?.type === 'number' && value !== '' && value != null) {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) payload[key] = numeric;
        }
    });

    return payload;
}

function isEmpty(value) {
    return value === undefined
        || value === null
        || value === ''
        || (Array.isArray(value) && value.length === 0);
}

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function inferPrefillSources(paramName) {
    const name = String(paramName || '').toLowerCase();
    if (name === 'vc' || name === 'vc_name' || name.includes('vcenter')) return ['vc', 'vcenter'];
    if (name.includes('dscluster') || name.includes('ds_cluster')) return ['ds_cluster', 'cluster'];
    if (name.includes('esxcluster') || name.includes('esx_cluster')) return ['esx_cluster', 'cluster'];
    if (name.includes('naa')) return ['naa'];
    if (name.includes('esxname') || name === 'hosts') return ['name'];
    if (name.includes('dsname') || name.includes('datastore')) return ['name', 'datastore'];
    if (name.includes('oracle')) return ['name'];
    if (name.includes('name')) return ['name'];
    return [];
}

function pickValue(row, sources) {
    for (const source of sources) {
        const value = row?.[source];
        if (!isEmpty(value)) return value;
    }
    return undefined;
}

function uniqueList(values) {
    return [...new Set(values.filter((value) => !isEmpty(value)))];
}

export function buildActionInitialValues(action, selectedRows) {
    if (!action || !selectedRows.length) return {};

    const values = {};

    action.params.forEach((param) => {
        const sources = param.prefillFrom ? asArray(param.prefillFrom) : inferPrefillSources(param.name);
        if (!sources.length) return;

        const mode = param.prefillMode || (param.multi ? 'list' : 'first');
        if (mode === 'list') {
            const list = uniqueList(selectedRows.map((row) => pickValue(row, sources)));
            if (list.length) {
                values[param.name] = param.multi ? list : list[0];
            }
            return;
        }

        const firstValue = selectedRows
            .map((row) => pickValue(row, sources))
            .find((value) => !isEmpty(value));
        if (!isEmpty(firstValue)) {
            values[param.name] = firstValue;
        }
    });

    return values;
}

export const buildDeleteInitialValues = buildActionInitialValues;
