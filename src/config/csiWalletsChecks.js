import {
    HiCollection,
    HiDatabase,
    HiSearch,
    HiServer,
} from 'react-icons/hi';
import { csiWalletsApi } from '@/api';

const CSI_WALLETS_CHECK_DEFINITIONS = [
    {
        key: 'pflex',
        label: 'Check PFlex Allocation',
        description: 'Check The Status Of The Allocation On Pflex',
        endpoint: '/check-pflex-allocation',
        icon: HiServer,
        fieldKeys: ['pflexServer', 'sizeInTb'],
        getParams: (values) => ({
            pflex_server: values.pflexServer,
            size_in_tb: values.sizeInTb,
        }),
        isDisabled: (values) => {
            const hasRequestedSize = Number.isFinite(Number(values.sizeInTb)) && Number(values.sizeInTb) > 0;
            return !values.pflexServer || !hasRequestedSize;
        },
        run: (values) => csiWalletsApi.checkPflexAllocation({
            sizeInTb: values.sizeInTb,
            pflexServer: values.pflexServer,
        }),
    },
    {
        key: 'ocp',
        label: 'Check OCP Allocation',
        description: 'Check The Status Of Allocation On The Openshift And The Powerflex Connected To Him',
        endpoint: '/check-ocp-allocation',
        icon: HiSearch,
        fieldKeys: ['openshift'],
        getParams: (values) => ({ openshift: values.openshift }),
        isDisabled: (values) => !values.openshift,
        run: (values) => csiWalletsApi.checkOcpAllocation({ openshift: values.openshift }),
    },
    {
        key: 'storage-class',
        label: 'Storage Class Check',
        description: 'Show Status On teh Storage Class From The Pflex Side',
        endpoint: '/storage_class_check',
        icon: HiCollection,
        fieldKeys: ['openshift', 'storageClass'],
        getParams: (values) => ({
            openshift: values.openshift,
            storage_class: values.storageClass,
        }),
        isDisabled: (values) => !values.openshift || !values.storageClass,
        run: (values) => csiWalletsApi.checkStorageClass({
            openshift: values.openshift,
            storageClass: values.storageClass,
        }),
    },
    {
        key: 'all',
        label: 'Check All SC On OCP',
        description: 'Show The Result OF Check OF Every Storage Class Of Openshift On Plfex Side',
        endpoint: '/check_all_sc_ocp',
        icon: HiDatabase,
        fieldKeys: ['openshift'],
        getParams: (values) => ({ openshift: values.openshift }),
        isDisabled: (values) => !values.openshift,
        run: (values) => csiWalletsApi.checkAllStorageClasses({ openshift: values.openshift }),
    },
];

export function buildCsiWalletChecks(values) {
    return CSI_WALLETS_CHECK_DEFINITIONS.map((definition) => ({
        key: definition.key,
        label: definition.label,
        description: definition.description,
        endpoint: definition.endpoint,
        icon: definition.icon,
        fieldKeys: definition.fieldKeys,
        params: definition.getParams(values),
        disabled: definition.isDisabled(values),
        run: () => definition.run(values),
    }));
}
