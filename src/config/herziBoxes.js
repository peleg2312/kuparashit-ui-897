// HerziTools box configuration
// Each box has: id, title, categories[], endpoint, inputLabel, inputType, resultLabel

const herziBoxes = [
    {
        id: 'get-naa-information',
        title: 'Get NAA Information',
        categories: ['STORAGE'],
        endpoint: '/get_naa_information',
        inputLabel: 'NAA',
        inputType: 'text',
        resultLabel: 'NAA Details',
    },
    {
        id: 'pwwn-to-esx',
        title: 'PWWN To ESX',
        categories: ['ESX', 'PWWN'],
        endpoint: '/pwwn_to_esx',
        inputLabel: 'PWWN',
        inputType: 'text',
        resultLabel: 'ESX Mapping',
    },
    {
        id: 'vm-or-ds-information',
        title: 'Get VM/DS Information',
        categories: ['VM', 'STORAGE'],
        endpoint: '/get_vm_or_ds_information',
        inputLabel: 'VM/Datastore',
        inputType: 'text',
        resultLabel: 'Object Details',
    },
    {
        id: 'unused-luns',
        title: 'Get Unused LUNs',
        categories: ['VC', 'STORAGE'],
        endpoint: '/unused_luns',
        inputLabel: 'vCenter',
        inputType: 'text',
        resultLabel: 'Unused LUNs',
    },
    {
        id: 'vc-data-from-naa',
        title: 'Get VC Data From NAA',
        categories: ['VC', 'STORAGE'],
        endpoint: '/vc_data_from_naa',
        inputLabel: 'NAA',
        inputType: 'text',
        resultLabel: 'vCenter Data',
    },
    {
        id: 'naa-to-tdev',
        title: 'NAA To TDEV',
        categories: ['STORAGE'],
        endpoint: '/naa_to_tdev',
        inputLabel: 'NAA',
        inputType: 'text',
        resultLabel: 'TDEV Mapping',
    },
    {
        id: 'convert-pwwn',
        title: 'Convert PWWN',
        categories: ['PWWN'],
        endpoint: '/convert_pwwn',
        inputLabel: 'PWWN',
        inputType: 'text',
        resultLabel: 'Converted PWWN',
    },
    {
        id: 'lun-or-vol-information',
        title: 'Get LUN/Volume Information',
        categories: ['STORAGE'],
        endpoint: '/get_lun_or_vol_information',
        inputLabel: 'LUN/Volume',
        inputType: 'text',
        resultLabel: 'LUN/Volume Details',
    },
];

export default herziBoxes;

export const herziCategories = ['ALL', 'STORAGE', 'ESX', 'VM', 'VC', 'PWWN'];

export function getBoxesByCategory(category) {
    if (category === 'ALL') return herziBoxes;
    return herziBoxes.filter((box) => box.categories.includes(category));
}
