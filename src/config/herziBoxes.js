// HerziTools box configuration
// Each box has: id, title, categories[], endpoint, inputLabel, inputType, resultLabel

const herziBoxes = [
    {
        id: 'vc-info',
        title: 'VC Info Lookup',
        categories: ['VC'],
        endpoint: '/herzi/vc-info',
        inputLabel: 'vCenter Name',
        inputType: 'text',
        resultLabel: 'vCenter Details',
    },
    {
        id: 'vc-health',
        title: 'VC Health Check',
        categories: ['VC'],
        endpoint: '/herzi/vc-health',
        inputLabel: 'vCenter Name',
        inputType: 'text',
        resultLabel: 'Health Status',
    },
    {
        id: 'vm-lookup',
        title: 'VM Lookup',
        categories: ['VM', 'VC'],
        endpoint: '/herzi/vm-lookup',
        inputLabel: 'VM Name',
        inputType: 'text',
        resultLabel: 'VM Location',
    },
    {
        id: 'vm-snapshot',
        title: 'VM Snapshot Info',
        categories: ['VM'],
        endpoint: '/herzi/vm-snapshot',
        inputLabel: 'VM Name',
        inputType: 'text',
        resultLabel: 'Snapshot Details',
    },
    {
        id: 'ds-usage',
        title: 'DS Usage Check',
        categories: ['DS'],
        endpoint: '/herzi/ds-usage',
        inputLabel: 'Datastore Name',
        inputType: 'text',
        resultLabel: 'Usage Info',
    },
    {
        id: 'ds-vms',
        title: 'DS VM List',
        categories: ['DS', 'VM'],
        endpoint: '/herzi/ds-vms',
        inputLabel: 'Datastore Name',
        inputType: 'text',
        resultLabel: 'VMs on Datastore',
    },
    {
        id: 'naa-lookup',
        title: 'NAA Lookup',
        categories: ['NAA'],
        endpoint: '/herzi/naa-lookup',
        inputLabel: 'NAA ID',
        inputType: 'text',
        resultLabel: 'NAA Details',
    },
    {
        id: 'naa-mapping',
        title: 'NAA Mapping',
        categories: ['NAA', 'DS'],
        endpoint: '/herzi/naa-mapping',
        inputLabel: 'NAA ID',
        inputType: 'text',
        resultLabel: 'Mapped Datastore',
    },
    {
        id: 'vm-naa',
        title: 'VM NAA Info',
        categories: ['VM', 'NAA'],
        endpoint: '/herzi/vm-naa',
        inputLabel: 'VM Name',
        inputType: 'text',
        resultLabel: 'NAA Devices',
    },
];

export default herziBoxes;

export const herziCategories = ['ALL', 'VC', 'VM', 'DS', 'NAA'];

export function getBoxesByCategory(category) {
    if (category === 'ALL') return herziBoxes;
    return herziBoxes.filter(b => b.categories.includes(category));
}
