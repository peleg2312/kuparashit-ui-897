export const herziQueryByScreen = {
    vms: { endpoint: '/herzi/vm-lookup', getInput: (row) => row.name },
    ds: { endpoint: '/herzi/ds-usage', getInput: (row) => row.name },
    rdm: { endpoint: '/herzi/naa-lookup', getInput: (row) => row.naa },
    esx: { endpoint: '/herzi/vc-info', getInput: (row) => row.vc },
};

export function formatHerziResult(result) {
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}
