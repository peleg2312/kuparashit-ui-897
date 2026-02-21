import { exchSiteParam } from './shared';

const exchActions = {
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
};

export default exchActions;
