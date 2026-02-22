export const machineTypes = {
    NETAPP: {
        label: 'NetApp',
        description: 'NetApp ONTAP Storage',
        color: '#2196f3',
        params: [
            { name: 'size', label: 'Size (GB)', type: 'number', required: true },
            {
                name: 'diskType',
                label: 'Disk Type',
                type: 'select',
                options: [
                    { value: 'SSD', label: 'SSD' },
                    { value: 'HDD', label: 'HDD' },
                ],
                defaultValue: 'SSD',
                required: true,
            },
            { name: 'iops', label: 'IOPS', type: 'number', required: false },
            {
                name: 'spare',
                label: 'Spare',
                type: 'toggle',
                trueLabel: 'With spare',
                falseLabel: 'Without spare',
                trueValue: 1,
                falseValue: 0,
                defaultValue: 0,
                required: false,
            },
        ],
    },
    PFLEX: {
        label: 'PowerFlex',
        description: 'Dell PowerFlex SDS',
        color: '#9c27b0',
        params: [
            { name: 'size', label: 'Size (GB)', type: 'number', required: true },
            {
                name: 'diskType',
                label: 'Disk Type',
                type: 'select',
                options: [
                    { value: 'SSD', label: 'SSD' },
                    { value: 'HDD', label: 'HDD' },
                ],
                defaultValue: 'SSD',
                required: true,
            },
            { name: 'replicas', label: 'Replicas', type: 'number', required: false },
            {
                name: 'spare',
                label: 'Spare',
                type: 'toggle',
                trueLabel: 'With spare',
                falseLabel: 'Without spare',
                trueValue: 1,
                falseValue: 0,
                defaultValue: 0,
                required: false,
            },
        ],
    },
    PMAX: {
        label: 'PowerMax',
        description: 'Dell PowerMax Array',
        color: '#ff9800',
        params: [
            { name: 'size', label: 'Size (GB)', type: 'number', required: true },
            {
                name: 'diskType',
                label: 'Disk Type',
                type: 'select',
                options: [
                    { value: 'SSD', label: 'SSD' },
                    { value: 'HDD', label: 'HDD' },
                ],
                defaultValue: 'SSD',
                required: true,
            },
            { name: 'srdf', label: 'Enable SRDF', type: 'toggle', required: false },
            {
                name: 'spare',
                label: 'Spare',
                type: 'toggle',
                trueLabel: 'With spare',
                falseLabel: 'Without spare',
                trueValue: 1,
                falseValue: 0,
                defaultValue: 0,
                required: false,
            },
        ],
    },
};

export function normalizePriceValues(values) {
    const normalized = {};
    Object.entries(values).forEach(([key, value]) => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                normalized[key] = value;
                return;
            }
            const numericValue = Number(trimmed);
            normalized[key] = Number.isNaN(numericValue) ? value : numericValue;
            return;
        }
        normalized[key] = value;
    });
    return normalized;
}

export function formatPriceDetailLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
