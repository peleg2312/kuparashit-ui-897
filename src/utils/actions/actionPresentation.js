import { HiCube, HiPlus, HiServer, HiTrash, HiViewGrid } from 'react-icons/hi';

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
