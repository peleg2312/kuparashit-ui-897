import { NETWORK_OPTIONS, normalizeNetworkOptions } from '../networks';

const networkOptions = normalizeNetworkOptions(NETWORK_OPTIONS);
const defaultNetwork = NETWORK_OPTIONS[0] || 'NesHarmin';
const exchSiteOptions = [
    { value: 'five', label: 'five' },
    { value: 'nova', label: 'nova' },
];
const defaultExchSite = 'five';

export const networkParam = {
    name: 'network',
    label: 'Network',
    type: 'dropdown',
    options: networkOptions,
    defaultValue: defaultNetwork,
    required: true,
};

export const vcenterParam = {
    name: 'vc_name',
    label: 'vCenter',
    type: 'dropdown-api',
    sourceApi: 'main',
    source: '/vc_collector/get_vcs',
    required: true,
    prefillFrom: ['vc', 'vcenter'],
};

export const esxClusterParam = {
    name: 'cluster_name',
    label: 'ESX Cluster',
    type: 'dropdown-api',
    sourceApi: 'kpr',
    source: '/network/{network}/vcenter/{vc_name}/clusters',
    dependsOn: ['network', 'vc_name'],
    required: true,
    prefillFrom: ['esx_cluster', 'cluster'],
};

export const dsClusterParam = {
    name: 'ds_cluster_name',
    label: 'DS Cluster',
    type: 'dropdown-api',
    sourceApi: 'kpr',
    source: '/network/{network}/vcenter/{vc_name}/ds_clusters',
    dependsOn: ['network', 'vc_name'],
    required: true,
    prefillFrom: ['ds_cluster', 'cluster'],
};

export const exchSiteParam = {
    name: 'site',
    label: 'Site',
    type: 'dropdown',
    options: exchSiteOptions,
    defaultValue: defaultExchSite,
    required: true,
};
