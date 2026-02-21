import { dsClusterParam, esxClusterParam, networkParam, vcenterParam } from './shared';

const rdmActions = {
    create: {
        label: 'Create RDM',
        api: 'kpr',
        method: 'post',
        endpoint: '/rdm',
        params: [
            networkParam,
            vcenterParam,
            esxClusterParam,
            dsClusterParam,
            {
                name: 'oracle_cluster_name',
                label: 'Oracle Name',
                type: 'text',
                required: true,
                prefillFrom: 'name',
            },
            { name: 'data_amount', label: 'Data Amount', type: 'number', required: true, min: 1, max: 128 },
            { name: 'data_size_in_gb', label: 'Data Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
            { name: 'rec_amount', label: 'REC Amount', type: 'number', required: true, min: 1, max: 128 },
            { name: 'rec_size_in_gb', label: 'REC Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
            { name: 'crs_amount', label: 'CRS Amount', type: 'number', required: true, min: 1, max: 128 },
            { name: 'crs_size_in_gb', label: 'CRS Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
        ],
    },
    delete: {
        label: 'Delete RDM',
        api: 'kpr',
        method: 'delete',
        endpoint: '/rdm/delete',
        params: [
            networkParam,
            vcenterParam,
            esxClusterParam,
            {
                name: 'naas',
                label: 'NAA List',
                type: 'dropdown-api',
                sourceApi: 'main',
                source: '/download/rdms',
                dependsOn: ['vc_name', 'cluster_name'],
                query: { vc: 'vc_name', esx_cluster: 'cluster_name' },
                optionField: 'naa',
                required: true,
                multi: true,
                prefillFrom: ['naa', 'name'],
                prefillMode: 'list',
            },
        ],
    },
};

export default rdmActions;
