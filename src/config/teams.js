const teams = {
    BLOCK: {
        id: 'BLOCK',
        name: 'BLOCK',
        description: 'Block Storage Team',
        screens: ['*'],
        color: '#e53935',
        image: null, // Will use generated initials
    },
    NASA: {
        id: 'NASA',
        name: 'NASA',
        description: 'NASA Storage Team',
        screens: ['qtree', 'ds'],
        color: '#2196f3',
        image: null,
    },
};

export default teams;

export function getTeamById(id) {
    return teams[id] || null;
}

export function getTeamsForUser(userTeamIds) {
    return userTeamIds.map(id => teams[id]).filter(Boolean);
}

export function isScreenAllowed(teamId, screenId) {
    const team = teams[teamId];
    if (!team) return false;
    if (team.screens.includes('*')) return true;
    return team.screens.includes(screenId);
}
