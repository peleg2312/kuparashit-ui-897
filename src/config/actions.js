// Declarative action configuration per screen
// Supported param types: text, number, dropdown, dropdown-api, toggle

const actions = {
    rdm: {
        create: {
            label: 'Create RDM',
            api: 'kpr',
            endpoint: '/rdm/create',
            params: [
                { name: 'vmName', label: 'VM Name', type: 'dropdown-api', source: '/vms/names', required: true },
                { name: 'vcenter', label: 'vCenter', type: 'dropdown-api', source: '/vcenters', required: true },
                { name: 'size', label: 'Size (GB)', type: 'number', required: true, min: 1, max: 10000 },
                { name: 'datastore', label: 'Datastore', type: 'dropdown-api', source: '/datastores/names', required: true },
                { name: 'description', label: 'Description', type: 'text', required: false },
            ],
        },
        delete: {
            label: 'Delete RDM',
            api: 'kpr',
            endpoint: '/rdm/delete',
            params: [
                { name: 'rdmName', label: 'RDM Name', type: 'dropdown-api', source: '/rdm/names', required: true, multi: true },
                { name: 'confirm', label: 'Confirm Deletion', type: 'toggle', required: true },
            ],
        },
    },

    ds: {
        create: {
            label: 'Create Datastore',
            api: 'kpr',
            endpoint: '/ds/create',
            params: [
                { name: 'name', label: 'Datastore Name', type: 'text', required: true },
                { name: 'vcenter', label: 'vCenter', type: 'dropdown-api', source: '/vcenters', required: true },
                { name: 'cluster', label: 'Cluster', type: 'dropdown-api', source: '/clusters/by-vc', dependsOn: 'vcenter', queryKey: 'vc', required: true },
                { name: 'esxHost', label: 'ESX Host', type: 'dropdown-api', source: '/esx/by-cluster', dependsOn: 'cluster', queryKey: 'cluster', required: true },
                { name: 'size', label: 'Size (TB)', type: 'number', required: true, min: 1, max: 500 },
                { name: 'type', label: 'Type', type: 'dropdown', options: ['VMFS', 'NFS', 'vSAN'], required: true },
            ],
        },
        delete: {
            label: 'Delete Datastore',
            api: 'kpr',
            endpoint: '/ds/delete',
            params: [
                { name: 'dsName', label: 'Datastore Name', type: 'dropdown-api', source: '/datastores/names', required: true, multi: true },
                { name: 'confirm', label: 'Confirm Deletion', type: 'toggle', required: true },
            ],
        },
        createCluster: {
            label: 'Create Cluster',
            api: 'kpr',
            endpoint: '/ds/cluster/create',
            params: [
                { name: 'clusterName', label: 'Cluster Name', type: 'text', required: true },
                { name: 'vcenter', label: 'vCenter', type: 'dropdown-api', source: '/vcenters', required: true },
                { name: 'datastores', label: 'Datastores', type: 'dropdown-api', source: '/datastores/names', required: true, multi: true },
            ],
        },
    },

    esx: {
        create: {
            label: 'Add ESX Host',
            api: 'kpr',
            endpoint: '/esx/create',
            params: [
                { name: 'hostname', label: 'Hostname', type: 'text', required: true },
                { name: 'ip', label: 'IP Address', type: 'text', required: true },
                { name: 'vcenter', label: 'vCenter', type: 'dropdown-api', source: '/vcenters', required: true },
                { name: 'cluster', label: 'Cluster', type: 'text', required: true },
                { name: 'username', label: 'Username', type: 'text', required: true },
                { name: 'password', label: 'Password', type: 'text', required: true, sensitive: true },
            ],
        },
        delete: {
            label: 'Remove ESX Host',
            api: 'kpr',
            endpoint: '/esx/delete',
            params: [
                { name: 'esxHost', label: 'ESX Host', type: 'dropdown-api', source: '/esx/names', required: true, multi: true },
                { name: 'confirm', label: 'Confirm Removal', type: 'toggle', required: true },
            ],
        },
        createCluster: {
            label: 'Create Cluster',
            api: 'kpr',
            endpoint: '/esx/cluster/create',
            params: [
                { name: 'clusterName', label: 'Cluster Name', type: 'text', required: true },
                { name: 'vcenter', label: 'vCenter', type: 'dropdown-api', source: '/vcenters', required: true },
                { name: 'hosts', label: 'ESX Hosts', type: 'dropdown-api', source: '/esx/names', dependsOn: 'vcenter', required: true, multi: true },
            ],
        },
    },

    exch: {
        create: {
            label: 'Create Volume',
            api: 'exch',
            endpoint: '/volume/create',
            params: [
                { name: 'volumeName', label: 'Volume Name', type: 'text', required: true },
                { name: 'aggregate', label: 'Aggregate', type: 'dropdown-api', source: '/aggregates', required: true },
                { name: 'size', label: 'Size (GB)', type: 'number', required: true, min: 1, max: 50000 },
                { name: 'protocol', label: 'Protocol', type: 'dropdown', options: ['NFS', 'CIFS', 'iSCSI', 'FC'], required: true },
                { name: 'exportPolicy', label: 'Export Policy', type: 'text', required: false },
            ],
        },
        delete: {
            label: 'Delete Volume',
            api: 'exch',
            endpoint: '/volume/delete',
            params: [
                { name: 'volumeName', label: 'Volume', type: 'dropdown-api', source: '/volumes', required: true, multi: true },
                { name: 'confirm', label: 'Confirm Deletion', type: 'toggle', required: true },
            ],
        },
        extend: {
            label: 'Extend Volume',
            api: 'exch',
            endpoint: '/volume/extend',
            params: [
                { name: 'volumeName', label: 'Volume', type: 'dropdown-api', source: '/volumes', required: true },
                { name: 'additionalSize', label: 'Additional Size (GB)', type: 'number', required: true, min: 1 },
            ],
        },
    },

    qtree: {
        create: {
            label: 'Create QTree',
            api: 'kpr',
            endpoint: '/qtree/create',
            params: [
                { name: 'qtreeName', label: 'QTree Name', type: 'text', required: true },
                { name: 'volume', label: 'Volume', type: 'dropdown-api', source: '/volumes', required: true },
                { name: 'securityStyle', label: 'Security Style', type: 'dropdown', options: ['unix', 'ntfs', 'mixed'], required: true },
                { name: 'exportPolicy', label: 'Export Policy', type: 'text', required: false },
            ],
        },
        delete: {
            label: 'Delete QTree',
            api: 'kpr',
            endpoint: '/qtree/delete',
            params: [
                { name: 'qtreeName', label: 'QTree', type: 'dropdown-api', source: '/qtrees', required: true, multi: true },
                { name: 'confirm', label: 'Confirm Deletion', type: 'toggle', required: true },
            ],
        },
        extend: {
            label: 'Extend QTree',
            api: 'kpr',
            endpoint: '/qtree/extend',
            params: [
                { name: 'qtreeName', label: 'QTree', type: 'dropdown-api', source: '/qtrees', required: true },
                { name: 'additionalSize', label: 'Additional Size (GB)', type: 'number', required: true, min: 1 },
            ],
        },
    },
};

export default actions;

export function getActionsForScreen(screenId) {
    return actions[screenId] || {};
}
