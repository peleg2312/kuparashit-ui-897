import { HiDatabase, HiSearch, HiServer } from 'react-icons/hi';

export const TROUBLESHOOTER_MODE_CONFIG = {
    vc: {
        key: 'vc',
        label: 'vCenter',
        icon: HiServer,
        color: '#2b7fff',
        subtitle: 'Scan environment via one vCenter.',
    },
    netapp: {
        key: 'netapp',
        label: 'NetApp',
        icon: HiSearch,
        color: '#0f9d62',
        subtitle: 'Scan environment via one NetApp machine.',
    },
    naas: {
        key: 'naas',
        label: 'NAAs',
        icon: HiDatabase,
        color: '#d2871f',
        subtitle: 'Scan environment via NAA list.',
    },
};
