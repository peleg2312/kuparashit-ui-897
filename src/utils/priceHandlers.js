export const machineTypes = {
    NETAPP: {
        label: 'NetApp',
        description: 'NetApp ONTAP Storage',
        color: '#2196f3',
        params: [
            { name: 'size', label: 'Size (GB)', type: 'number', required: true },
            { name: 'iops', label: 'IOPS', type: 'number', required: false },
        ],
    },
    PFLEX: {
        label: 'PowerFlex',
        description: 'Dell PowerFlex SDS',
        color: '#9c27b0',
        params: [
            { name: 'size', label: 'Size (GB)', type: 'number', required: true },
            { name: 'replicas', label: 'Replicas', type: 'number', required: false },
        ],
    },
    PMAX: {
        label: 'PowerMax',
        description: 'Dell PowerMax Array',
        color: '#ff9800',
        params: [
            { name: 'size', label: 'Size (GB)', type: 'number', required: true },
            { name: 'srdf', label: 'Enable SRDF', type: 'toggle', required: false },
        ],
    },
};

export function normalizePriceValues(values) {
    const normalized = {};
    Object.entries(values).forEach(([key, value]) => {
        normalized[key] = typeof value === 'string' ? Number(value) : value;
    });
    return normalized;
}

export function formatPriceDetailLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
