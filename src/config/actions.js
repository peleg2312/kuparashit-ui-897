import { NETWORK_OPTIONS, normalizeNetworkOptions } from './networks';

const networkOptions = normalizeNetworkOptions(NETWORK_OPTIONS);
const defaultNetwork = NETWORK_OPTIONS[0] || 'NesHarmin';
const exchSiteOptions = [
    { value: 'five', label: 'five' },
    { value: 'nova', label: 'nova' },
];
const defaultExchSite = 'five';

const networkParam = {
    name: 'network',
    label: 'Network',
    type: 'dropdown',
    options: networkOptions,
    defaultValue: defaultNetwork,
    required: true,
};

const vcenterParam = {
    name: 'vc_name',
    label: 'vCenter',
    type: 'dropdown-api',
    sourceApi: 'main',
    source: '/vc_collector/get_vcs',
    required: true,
    prefillFrom: ['vc', 'vcenter'],
};

const esxClusterParam = {
    name: 'cluster_name',
    label: 'ESX Cluster',
    type: 'dropdown-api',
    sourceApi: 'kpr',
    source: '/network/{network}/vcenter/{vc_name}/clusters',
    dependsOn: ['network', 'vc_name'],
    required: true,
    prefillFrom: ['esx_cluster', 'cluster'],
};

const dsClusterParam = {
    name: 'ds_cluster_name',
    label: 'DS Cluster',
    type: 'dropdown-api',
    sourceApi: 'kpr',
    source: '/network/{network}/vcenter/{vc_name}/ds_clusters',
    dependsOn: ['network', 'vc_name'],
    required: true,
    prefillFrom: ['ds_cluster', 'cluster'],
};

const exchSiteParam = {
    name: 'site',
    label: 'Site',
    type: 'dropdown',
    options: exchSiteOptions,
    defaultValue: defaultExchSite,
    required: true,
};

const actions = {
    rdm: {
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
    },

    ds: {
        create: {
            label: 'Create Datastore',
            api: 'kpr',
            method: 'post',
            endpoint: '/datastore',
            params: [
                networkParam,
                vcenterParam,
                dsClusterParam,
                esxClusterParam,
                { name: 'amount', label: 'Amount', type: 'number', required: true, min: 1, max: 1000 },
            ],
        },
        delete: {
            label: 'Remove Datastore',
            api: 'kpr',
            method: 'delete',
            endpoint: '/datastore',
            params: [
                networkParam,
                vcenterParam,
                {
                    name: 'cluster_name',
                    label: 'DS Cluster',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/ds_clusters',
                    dependsOn: ['network', 'vc_name'],
                    required: true,
                    prefillFrom: ['ds_cluster', 'cluster'],
                },
                {
                    name: 'ds_names',
                    label: 'Datastores',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/cluster/{cluster_name}/datastores',
                    dependsOn: ['network', 'vc_name', 'cluster_name'],
                    required: true,
                    multi: true,
                    prefillFrom: 'name',
                    prefillMode: 'list',
                },
            ],
        },
        createCluster: {
            label: 'Create DS Cluster',
            api: 'kpr',
            method: 'post',
            endpoint: '/ds_cluster/ontap',
            endpointSelector: 'clusterType',
            endpointByValue: {
                netapp: '/ds_cluster/ontap',
                vmax: '/ds_cluster/vmax',
                pflex: '/ds_cluster/pflex',
            },
            params: [
                networkParam,
                vcenterParam,
                {
                    name: 'clusterType',
                    label: 'Cluster Type',
                    type: 'dropdown',
                    options: [
                        { value: 'netapp', label: 'NetApp' },
                        { value: 'vmax', label: 'VMAX' },
                        { value: 'pflex', label: 'PFlex' },
                    ],
                    required: true,
                    send: false,
                },
                { name: 'cluster_name', label: 'Cluster Name', type: 'text', required: true },
                { name: 'size', label: 'Size In TB', type: 'text', required: true },
                { name: 'amount', label: 'Amount Of Ds', type: 'text', required: true },
                {
                    name: 'svm',
                    label: 'SVM',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'target_fcalias',
                    label: 'Target Fcalias',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'storage_array_ip',
                    label: 'Storage Array Ip',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'node_name',
                    label: 'Node Name',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'unisphere_ip',
                    label: 'Unisphere Ip',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'sid',
                    label: 'Sid Of Vmax',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'target_fcalias',
                    label: 'Target Fcalias',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'pg_name',
                    label: 'PG Name',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                }
            ],
        },
    },

    esx: {
        create: {
            label: 'Add ESX Host',
            api: 'kpr',
            method: 'put',
            endpoint: '/zoner/hosts',
            params: [
                networkParam,
                vcenterParam,
                dsClusterParam,
                {
                    name: 'esx_cluster_name',
                    label: 'ESX Cluster',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/clusters',
                    dependsOn: ['network', 'vc_name'],
                    required: true,
                    prefillFrom: ['esx_cluster', 'cluster'],
                },
                {
                    name: 'original_esx_cluster',
                    label: 'Original ESX Cluster',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/clusters',
                    dependsOn: ['network', 'vc_name'],
                    required: true,
                    send: false,
                    prefillFrom: ['esx_cluster', 'cluster'],
                },
                {
                    name: 'hosts',
                    label: 'ESX Names',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/cluster/{original_esx_cluster}/hosts',
                    dependsOn: ['network', 'vc_name', 'original_esx_cluster'],
                    required: true,
                    multi: true,
                    prefillFrom: 'name',
                    prefillMode: 'list',
                },
            ],
        },
        delete: {
            label: 'Remove ESX Host',
            api: 'kpr',
            method: 'delete',
            endpoint: '/zoner/hosts',
            params: [
                networkParam,
                vcenterParam,
                {
                    name: 'esx_cluster_name',
                    label: 'ESX Cluster',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/clusters',
                    dependsOn: ['network', 'vc_name'],
                    required: true,
                    prefillFrom: ['esx_cluster', 'cluster'],
                },
                {
                    name: 'hosts',
                    label: 'ESX Names',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc_name}/cluster/{esx_cluster_name}/hosts',
                    dependsOn: ['network', 'vc_name', 'esx_cluster_name'],
                    required: true,
                    multi: true,
                    prefillFrom: 'name',
                    prefillMode: 'list',
                },
            ],
        },
        createCluster: {
            label: 'Add ESX Cluster',
            api: 'kpr',
            method: 'post',
            endpoint: '/zoner/ontap/cluster',
            endpointSelector: 'clusterType',
            endpointByValue: {
                netapp: '/zoner/ontap/cluster',
                vmax: '/zoner/vmax/cluster',
            },
            params: [
                networkParam,
                vcenterParam,
                {
                    name: 'clusterType',
                    label: 'Cluster Type',
                    type: 'dropdown',
                    options: [
                        { value: 'netapp', label: 'NetApp' },
                        { value: 'vmax', label: 'VMAX' },
                    ],
                    required: true,
                    send: false,
                },
                esxClusterParam,
                {
                    name: 'svm',
                    label: 'SVM',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'ontap_ip',
                    label: 'Ontap Ip',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'unisphere_ip',
                    label: 'Unisphere Ip',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'sid',
                    label: 'Sid',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'target_fcalias',
                    label: 'Target Fcalias',
                    type: 'text',
                    required: true,
                }
                
            ],
        },
    },

    exch: {
        create: {
            label: 'Create LUN',
            api: 'exch',
            method: 'post',
            endpoint: '/lun/create',
            listFields: ['db_names'],
            params: [
                exchSiteParam,
                {
                    name: 'server_name',
                    label: 'IGroup / Server Name',
                    type: 'dropdown-api',
                    sourceApi: 'exch',
                    source: '/igroups',
                    dependsOn: 'site',
                    query: { site: 'site' },
                    required: true,
                },
                { name: 'db_names', label: 'DB Names (comma separated)', type: 'text', required: true },
                { name: 'lun_size', label: 'LUN Size (TB)', type: 'number', required: true, min: 1 },
            ],
        },
        delete: {
            label: 'Delete LUN',
            api: 'exch',
            method: 'post',
            endpoint: '/lun/delete',
            listFields: ['serials'],
            params: [
                exchSiteParam,
                { name: 'serials', label: 'Serials (comma separated)', type: 'text', required: true },
            ],
        },
        extend: {
            label: 'Expand LUN',
            api: 'exch',
            method: 'put',
            endpoint: '/lun/expand',
            listFields: ['serials'],
            params: [
                exchSiteParam,
                { name: 'serials', label: 'Serials (comma separated)', type: 'text', required: true },
                { name: 'size_to_add', label: 'Size To Add (TB)', type: 'number', required: true, min: 1 },
            ],
        },
    },

    qtree: {
        create: {
            label: 'Create QTree',
            api: 'kpr',
            method: 'post',
            endpoint: '/qtree/',
            params: [
                networkParam,
                { name: 'svm', label: 'SVM Name', type: 'text', required: true },
                { name: 'volume_name', label: 'Volume Name', type: 'text', required: true },
                { name: 'qtree_name', label: 'QTree Name', type: 'text', required: true },
                { name: 'set_quota', label: 'Enable QTree Quota', type: 'toggle', required: true, defaultValue: false },
                {
                    name: 'size_in_mb',
                    label: 'Size (MB)',
                    type: 'number',
                    required: true,
                    min: 1,
                    visibleWhen: { field: 'set_quota', equals: true },
                },
            ],
        },
        delete: {
            label: 'Delete QTree',
            api: 'kpr',
            method: 'delete',
            endpoint: '/qtree/',
            params: [
                networkParam,
                { name: 'svm', label: 'SVM Name', type: 'text', required: true },
                { name: 'volume_name', label: 'Volume Name', type: 'text', required: true },
                { name: 'qtree_name', label: 'QTree Name', type: 'text', required: true },
            ],
        },
        extend: {
            label: 'Extend QTree',
            api: 'kpr',
            method: 'patch',
            endpoint: '/qtree/',
            params: [
                networkParam,
                { name: 'svm', label: 'SVM Name', type: 'text', required: true },
                { name: 'volume_name', label: 'Volume Name', type: 'text', required: true },
                { name: 'qtree_name', label: 'QTree Name', type: 'text', required: true },
                { name: 'size_in_mb', label: 'Size (MB)', type: 'number', required: true, min: 1 },
            ],
        },
    },
};

export default actions;

export function getActionsForScreen(screenId) {
    return actions[screenId] || {};
}
