import { networkParam } from './shared';

const qtreeActions = {
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
};

export default qtreeActions;
