// HerziTools box configuration
// Each box has: id, title, categories[], endpoint, inputLabel, inputType, resultLabel

const herziBoxes = [
    {
        id: 'naa-ds-information',
        title: 'Get NAA/DS Information',
        categories: ['STORAGE'],
        endpoint: '/herzi/naa-ds-information',
        inputLabel: 'DS/NAA',
        inputType: 'text',
        resultLabel: 'NAA/DS Details',
    },
    {
        id: 'esx-pwwn',
        title: 'Get ESX PWWN',
        categories: ['ESX'],
        endpoint: '/herzi/esx-pwwn',
        inputLabel: 'ESX',
        inputType: 'text',
        resultLabel: 'ESX PWWN List',
    },
    {
        id: 'vm-information',
        title: 'Get VM Information',
        categories: ['VM'],
        endpoint: '/herzi/vm-information',
        inputLabel: 'VM',
        inputType: 'text',
        resultLabel: 'VM Details',
    },
    {
        id: 'unused-luns',
        title: 'Get Unused LUNs',
        categories: ['VC', 'STORAGE'],
        endpoint: '/herzi/unused-luns',
        inputLabel: 'VC',
        inputType: 'text',
        resultLabel: 'Unused LUNs',
    },
    {
        id: 'lun-volume-information',
        title: 'Get LUN/Volume Information',
        categories: ['STORAGE'],
        endpoint: '/herzi/lun-volume-information',
        inputLabel: 'LUN/Vol',
        inputType: 'text',
        resultLabel: 'LUN/Volume Details',
    },
    {
        id: 'change-pwwn',
        title: 'Change PWWN',
        categories: ['PWWN', 'ESX'],
        endpoint: '/herzi/change-pwwn',
        inputLabel: 'PWWNS',
        inputType: 'text',
        resultLabel: 'PWWN Change Result',
    },
];

export default herziBoxes;

export const herziCategories = ['ALL', 'STORAGE', 'ESX', 'VM', 'VC', 'PWWN'];

export function getBoxesByCategory(category) {
    if (category === 'ALL') return herziBoxes;
    return herziBoxes.filter(b => b.categories.includes(category));
}
