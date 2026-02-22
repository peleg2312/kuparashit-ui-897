export const herziQueryByScreen = {
    vms: { endpoint: '/get_vm_or_ds_information', getInput: (row) => row.name },
    ds: { endpoint: '/get_vm_or_ds_information', getInput: (row) => row.name },
    rdm: { endpoint: '/get_naa_information', getInput: (row) => row.naa },
    esx: {
        endpoint: '/pwwn_to_esx',
        getInput: (row) => (Array.isArray(row.pwwns) ? row.pwwns[0] : row.name),
    },
};
