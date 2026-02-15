import NasaLogo from '../assets/teams/nasa-logo.svg';

const teams = {
    BLOCK: {
        id: 'BLOCK',
        name: 'BLOCK',
        permissionKey: 'isBlock',
        description: 'Block Storage Team',
        screens: ['*'],
        color: '#e53935',
        image: null, // Will use generated initials
    },
    NASA: {
        id: 'NASA',
        name: 'NASA',
        permissionKey: 'isNasa',
        description: 'NASA Storage Team',
        screens: ['qtree', 'ds','netapp-upgrade','netapp-multi-exec'],
        color: '#2196f3',
        image: NasaLogo,
    },
    Shimiada: {
        id: 'Shimiada',
        name: 'Shimiada',
        permissionKey: 'isShimiada',
        description: 'Shimiada Storage Admins',
        screens: ['price', 'refael'],
        color: '#87ce30',
        image: null,
    },
    Vans: {
        id: 'Vans',
        name: 'Vans',
        permissionKey: 'isStorageAdmin',
        description: 'Vans Controll Room',
        screens: ['herzitools'],
        color: '#d52308',
        image: null,
    },
    Virtu: {
        id: 'Virtu',
        name: 'Virtu',
        permissionKey: 'isVirualizationAdmin',
        description: 'Virtu Special Place',
        screens: ['esx'],
        color: '#caf00e',
        image: null,
    },
    Team49: {
        id: 'Team49',
        name: 'Team49',
        permissionKey: 'is49Client',
        description: '49 Clients',
        screens: ['qtree'],
        color: '#0ef030',
        image: null,
    },
    Orca: {
        id: 'Orca',
        name: 'Orca',
        permissionKey: 'isOrcaAdmin',
        description: 'Orca Vms Specialist',
        screens: ['herzitools'],
        color: '#0e4ef0',
        image: null,
    },
};

export default teams;

const teamIds = new Set(Object.keys(teams));
const backendKeyToTeamId = Object.values(teams).reduce((acc, team) => {
    const rawKey = String(team?.permissionKey || team?.id || '').trim();
    if (!rawKey) return acc;
    acc[rawKey] = team.id;
    acc[rawKey.toLowerCase()] = team.id;
    return acc;
}, {});

export function resolveTeamId(teamOrPermissionName) {
    const value = String(teamOrPermissionName || '').trim();
    if (!value) return null;
    if (teamIds.has(value)) return value;
    return backendKeyToTeamId[value] || backendKeyToTeamId[value.toLowerCase()] || null;
}

export function getTeamById(id) {
    const teamId = resolveTeamId(id);
    return teamId ? teams[teamId] : null;
}

export function getTeamsForUser(userTeamIds) {
    return userTeamIds.map((id) => getTeamById(id)).filter(Boolean);
}

export function getTeamPermissionKey(teamId) {
    const team = getTeamById(teamId);
    return team ? String(team.permissionKey || team.id) : String(teamId || '');
}

export function isScreenAllowed(teamId, screenId) {
    const team = getTeamById(teamId);
    if (!team) return false;
    if (team.screens.includes('*')) return true;
    return team.screens.includes(screenId);
}

