import {
    HiServer, HiDatabase, HiChip, HiDesktopComputer,
    HiSwitchHorizontal, HiCollection, HiUpload,
    HiCurrencyDollar, HiCog, HiTerminal, HiLightningBolt, HiSearch, HiCode, HiUserGroup
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
    { id: 'troubleshooter', label: 'Troubleshooter', path: '/troubleshooter', icon: HiSearch, group: 'storage', groupLabel: 'Storage Management' },
    { id: 'mds-builder', label: 'MDS Builder', path: '/scripts/mds-builder', icon: HiCode, group: 'scripts', groupLabel: 'Scripts' },

    // Tools
    { id: 'refael', label: 'Refael Tools', path: '/refael-tools', icon: HiUpload, group: 'tools', groupLabel: 'Advanced Tools' },
    { id: 'price', label: 'Price Calculator', path: '/price', icon: HiCurrencyDollar, group: 'tools', groupLabel: 'Advanced Tools' },
    { id: 'herzitools', label: 'Herzi Tools', path: '/herzi-tools', icon: HiCog, group: 'tools', groupLabel: 'Advanced Tools' },
    { id: 'netapp-upgrade', label: 'NetApp Upgrade', path: '/netapp-upgrade', icon: HiTerminal, group: 'netapp', groupLabel: 'NetApp Operations' },
    { id: 'netapp-multi-exec', label: 'NetApp Multi Exec', path: '/netapp-multi-exec', icon: HiLightningBolt, group: 'netapp', groupLabel: 'NetApp Operations' },
    {
        id: 'user-management',
        label: 'User Management',
        path: '/admin/user-management',
        icon: HiUserGroup,
        group: 'admin',
        groupLabel: 'Administration',
        adminOnly: true,
    },
];

export default screens;

export function getScreensByGroup(allowedScreenIds, { isAdmin = false } = {}) {
    const filteredByPermissions = allowedScreenIds.includes('*')
        ? screens
        : screens.filter(s => allowedScreenIds.includes(s.id));

    const filtered = filteredByPermissions.filter((screen) => !screen.adminOnly || isAdmin);

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

