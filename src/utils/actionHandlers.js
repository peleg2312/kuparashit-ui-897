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
    if (name === 'vc' || name.includes('vcenter')) return ['vc', 'vcenter'];
    if (name.includes('dscluster')) return ['ds_cluster', 'cluster'];
    if (name.includes('esxcluster')) return ['esx_cluster', 'cluster'];
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
