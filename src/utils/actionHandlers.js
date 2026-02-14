import { HiPlus, HiTrash, HiViewGrid, HiCube, HiServer } from 'react-icons/hi';
import { exchApi, kprApi, mainApi } from '../api';

export const actionIconMap = {
    create: HiPlus,
    delete: HiTrash,
    createCluster: HiViewGrid,
    extend: HiCube,
    default: HiServer,
};

export const actionButtonStyleMap = {
    create: 'btn-primary',
    delete: 'btn-danger',
    createCluster: 'btn-secondary',
    extend: 'btn-secondary',
};

export const actionCardColorMap = {
    create: 'var(--accent)',
    delete: 'var(--error)',
    createCluster: 'var(--info)',
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

export function buildDeleteInitialValues(action, selectedRows) {
    if (!action || !selectedRows.length) return {};

    const values = {};
    const names = selectedRows.map((row) => row.name || row.naa).filter(Boolean);
    const first = selectedRows[0];

    action.params.forEach((param, index) => {
        if (index === 0) {
            values[param.name] = param.multi ? names : (names[0] || '');
            return;
        }
        if (param.name === 'vcenter' && first?.vcenter) values[param.name] = first.vcenter;
        if (param.name === 'cluster' && first?.cluster) values[param.name] = first.cluster;
    });

    return values;
}
