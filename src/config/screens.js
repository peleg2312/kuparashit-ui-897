import {
    HiServer, HiDatabase, HiChip, HiDesktopComputer,
    HiSwitchHorizontal, HiCollection, HiUpload,
    HiCurrencyDollar, HiCog, HiTerminal, HiLightningBolt
} from 'react-icons/hi';

const screens = [
    // Main Dashboard group
    { id: 'rdm', label: 'RDM', path: '/dashboard/rdm', icon: HiDatabase, group: 'dashboard', groupLabel: 'Overview' },
    { id: 'ds', label: 'Datastores', path: '/dashboard/ds', icon: HiServer, group: 'dashboard', groupLabel: 'Overview' },
    { id: 'esx', label: 'ESX Hosts', path: '/dashboard/esx', icon: HiChip, group: 'dashboard', groupLabel: 'Overview' },
    { id: 'vms', label: 'Virtual Machines', path: '/dashboard/vms', icon: HiDesktopComputer, group: 'dashboard', groupLabel: 'Overview' },

    // Additional screens
    { id: 'exch', label: 'EXCH', path: '/exch', icon: HiSwitchHorizontal, group: 'storage', groupLabel: 'Storage Management' },
    { id: 'qtree', label: 'QTREE', path: '/qtree', icon: HiCollection, group: 'storage', groupLabel: 'Storage Management' },

    // Tools
    { id: 'refhael', label: 'Refhael Tools', path: '/refhael-tools', icon: HiUpload, group: 'tools', groupLabel: 'Advanced Tools' },
    { id: 'price', label: 'Price Calculator', path: '/price', icon: HiCurrencyDollar, group: 'tools', groupLabel: 'Advanced Tools' },
    { id: 'herzitools', label: 'Herzi Tools', path: '/herzi-tools', icon: HiCog, group: 'tools', groupLabel: 'Advanced Tools' },
    { id: 'netapp-upgrade', label: 'NetApp Upgrade', path: '/netapp-upgrade', icon: HiTerminal, group: 'netapp', groupLabel: 'NetApp Operations' },
    { id: 'netapp-multi-exec', label: 'NetApp Multi Exec', path: '/netapp-multi-exec', icon: HiLightningBolt, group: 'netapp', groupLabel: 'NetApp Operations' },
];

export default screens;

export function getScreensByGroup(allowedScreenIds) {
    const filtered = allowedScreenIds.includes('*')
        ? screens
        : screens.filter(s => allowedScreenIds.includes(s.id));

    const groups = {};
    filtered.forEach(screen => {
        if (!groups[screen.group]) {
            groups[screen.group] = { label: screen.groupLabel, screens: [] };
        }
        groups[screen.group].screens.push(screen);
    });
    return groups;
}

export function getScreenById(id) {
    return screens.find(s => s.id === id);
}
