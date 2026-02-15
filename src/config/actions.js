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
    name: 'vc',
    label: 'vCenter',
    type: 'dropdown-api',
    sourceApi: 'main',
    source: '/vc_collector/get_vcs',
    required: true,
    prefillFrom: ['vc', 'vcenter'],
};

const esxClusterParam = {
    name: 'esxCluster',
    label: 'ESX Cluster',
    type: 'dropdown-api',
    sourceApi: 'kpr',
    source: '/network/{network}/vcenter/{vc}/clusters',
    dependsOn: ['network', 'vc'],
    required: true,
    prefillFrom: ['esx_cluster', 'cluster'],
};

const dsClusterParam = {
    name: 'dsCluster',
    label: 'DS Cluster',
    type: 'dropdown-api',
    sourceApi: 'kpr',
    source: '/network/{network}/vcenter/{vc}/ds_clusters',
    dependsOn: ['network', 'vc'],
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
                    name: 'oracleName',
                    label: 'Oracle Name',
                    type: 'text',
                    required: true,
                    prefillFrom: 'name',
                },
                { name: 'dataAmount', label: 'Data Amount', type: 'number', required: true, min: 1, max: 128 },
                { name: 'dataSize', label: 'Data Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
                { name: 'recAmount', label: 'REC Amount', type: 'number', required: true, min: 1, max: 128 },
                { name: 'recSize', label: 'REC Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
                { name: 'crsAmount', label: 'CRS Amount', type: 'number', required: true, min: 1, max: 128 },
                { name: 'crsSize', label: 'CRS Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
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
                    dependsOn: ['vc', 'esxCluster'],
                    query: { vc: 'vc', esx_cluster: 'esxCluster' },
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
                dsClusterParam,
                {
                    name: 'dsNames',
                    label: 'Datastores',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc}/datatores',
                    dependsOn: ['network', 'vc'],
                    query: { ds_cluster: 'dsCluster' },
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
                },
                { name: 'clusterName', label: 'Cluster Name', type: 'text', required: true },
                {
                    name: 'svm',
                    label: 'SVM',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'storageGroup',
                    label: 'Storage Group',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'protectionDomain',
                    label: 'Protection Domain',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'pflex' },
                },
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
                {
                    name: 'originalEsxCluster',
                    label: 'Original ESX Cluster',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc}/clusters',
                    dependsOn: ['network', 'vc'],
                    required: true,
                    prefillFrom: ['esx_cluster', 'cluster'],
                },
                {
                    name: 'targetEsxCluster',
                    label: 'Target ESX Cluster',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc}/clusters',
                    dependsOn: ['network', 'vc'],
                    required: true,
                    prefillFrom: ['esx_cluster', 'cluster'],
                },
                {
                    name: 'esxNames',
                    label: 'ESX Names',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc}/hosts',
                    dependsOn: ['network', 'vc'],
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
                esxClusterParam,
                {
                    name: 'esxNames',
                    label: 'ESX Names',
                    type: 'dropdown-api',
                    sourceApi: 'kpr',
                    source: '/network/{network}/vcenter/{vc}/hosts',
                    dependsOn: ['network', 'vc'],
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
                },
                { name: 'clusterName', label: 'Cluster Name', type: 'text', required: true },
                {
                    name: 'managementVlan',
                    label: 'Management VLAN',
                    type: 'number',
                    required: true,
                    min: 1,
                    max: 4094,
                    visibleWhen: { field: 'clusterType', equals: 'netapp' },
                },
                {
                    name: 'fabricA',
                    label: 'Fabric A',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
                {
                    name: 'fabricB',
                    label: 'Fabric B',
                    type: 'text',
                    required: true,
                    visibleWhen: { field: 'clusterType', equals: 'vmax' },
                },
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
            endpoint: '/qtree',
            params: [
                networkParam,
                vcenterParam,
                { name: 'qtreeName', label: 'QTree Name', type: 'text', required: true },
                { name: 'volume', label: 'Volume', type: 'text', required: true },
                { name: 'securityStyle', label: 'Security Style', type: 'dropdown', options: ['unix', 'ntfs', 'mixed'], required: true },
                { name: 'exportPolicy', label: 'Export Policy', type: 'text', required: false },
            ],
        },
        delete: {
            label: 'Delete QTree',
            api: 'kpr',
            method: 'delete',
            endpoint: '/qtree',
            params: [
                networkParam,
                vcenterParam,
                { name: 'qtreeName', label: 'QTree Names (comma separated)', type: 'text', required: true },
                { name: 'confirm', label: 'Confirm Deletion', type: 'toggle', required: true },
            ],
            listFields: ['qtreeName'],
        },
        extend: {
            label: 'Extend QTree',
            api: 'kpr',
            method: 'patch',
            endpoint: '/qtree',
            params: [
                networkParam,
                vcenterParam,
                { name: 'qtreeName', label: 'QTree', type: 'text', required: true },
                { name: 'additionalSize', label: 'Additional Size (GB)', type: 'number', required: true, min: 1 },
            ],
        },
    },
};

export default actions;

export function getActionsForScreen(screenId) {
    return actions[screenId] || {};
}
