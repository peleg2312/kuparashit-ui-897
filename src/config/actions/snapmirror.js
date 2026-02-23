import { networkParam } from './shared';

const snapmirrorActions = {
    create: {
        label: 'Create SnapMirror',
        api: 'kpr',
        method: 'post',
        endpoint: '/snapmirror/',
        params: [
            networkParam,
            { name: 'source_svm', label: 'Source SVM', type: 'text', required: true },
            { name: 'source_volume', label: 'Source Volume', type: 'text', required: true },
            { name: 'destination_svm', label: 'Destination SVM', type: 'text', required: true },
            { name: 'destination_volume', label: 'Destination Volume', type: 'text', required: true },
        ],
    },
    break: {
        label: 'Break SnapMirror',
        api: 'kpr',
        method: 'patch',
        endpoint: '/snapmirror/',
        params: [
            networkParam,
            { name: 'destination_svm', label: 'Destination SVM', type: 'text', required: true },
            { name: 'destination_volume', label: 'Destination Volume', type: 'text', required: true },
        ],
    },
    delete: {
        label: 'Delete SnapMirror',
        api: 'kpr',
        method: 'delete',
        endpoint: '/snapmirror/',
        params: [
            networkParam,
            { name: 'source_svm', label: 'Source SVM', type: 'text', required: true },
            { name: 'source_volume', label: 'Source Volume', type: 'text', required: true },
            { name: 'destination_svm', label: 'Destination SVM', type: 'text', required: true },
            { name: 'destination_volume', label: 'Destination Volume', type: 'text', required: true },
        ],
    },
};

export default snapmirrorActions;
