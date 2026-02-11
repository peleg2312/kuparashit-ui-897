import teams from '../config/teams';
import { users } from './mockData';
import { ACCESS_TOKEN_COOKIE, USE_MOCK_API } from './config';
import { clearCookie, getCookie, setCookie } from './cookies';
import { delay } from './common';
import { mainHttp } from './httpClient';

function getPermissionsForTeams(teamIds = []) {
    const allowed = new Set();
    for (const teamId of teamIds) {
        const team = teams[teamId];
        if (!team) continue;
        if (team.screens.includes('*')) return ['*'];
        team.screens.forEach((screenId) => allowed.add(screenId));
    }
    return Array.from(allowed);
}

function buildMockAuthPayload(user, authMode = 'local', tokenOverride = '') {
    const teamIds = user.teams || [];
    const permissions = getPermissionsForTeams(teamIds);
    const token = tokenOverride || `mock-${user.id}-${Date.now()}`;
    return {
        user,
        authMode,
        token,
        teams: teamIds,
        permissions,
    };
}

function resolveMockUserByToken(token) {
    if (!token) return null;
    const parts = token.split('-');
    const userId = parts.length >= 3 ? parts[1] : '';
    return users.find((item) => item.id === userId) || null;
}

export const authApi = {
    async loginLocal({ username, password }) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.post('/auth/login/local', { username, password });
            if (response.data?.token) setCookie(ACCESS_TOKEN_COOKIE, response.data.token);
            return response.data;
        }

        await delay(400);
        const normalized = (username || '').trim().toLowerCase();
        const foundUser = users.find(
            (item) =>
                item.email.split('@')[0].toLowerCase() === normalized
                || item.name.toLowerCase().includes(normalized),
        );
        if (!foundUser) {
            throw new Error('Invalid local user');
        }
        const payload = buildMockAuthPayload(foundUser, 'local');
        setCookie(ACCESS_TOKEN_COOKIE, payload.token);
        return payload;
    },

    async loginAdfs() {
        if (!USE_MOCK_API) {
            const response = await mainHttp.post('/auth/login/adfs');
            if (response.data?.token) setCookie(ACCESS_TOKEN_COOKIE, response.data.token);
            return response.data;
        }

        await delay(500);
        const adfsUser = users.find((item) => item.email === 'maya@company.com') || users[0];
        const payload = buildMockAuthPayload(adfsUser, 'adfs');
        setCookie(ACCESS_TOKEN_COOKIE, payload.token);
        return payload;
    },

    async getSession() {
        if (!USE_MOCK_API) {
            const response = await mainHttp.get('/auth/session');
            return response.data;
        }

        await delay(200);
        const token = getCookie(ACCESS_TOKEN_COOKIE);
        const user = resolveMockUserByToken(token);
        if (!user) return null;
        return buildMockAuthPayload(user, 'cookie', token);
    },

    async getPermissions(teamIds) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.get('/auth/permissions', {
                params: { teams: teamIds },
            });
            return response.data;
        }

        await delay(150);
        const ids = Array.isArray(teamIds) ? teamIds : [];
        return {
            teams: ids,
            permissions: getPermissionsForTeams(ids),
        };
    },

    async logout() {
        if (!USE_MOCK_API) {
            try {
                await mainHttp.post('/auth/logout');
            } finally {
                clearCookie(ACCESS_TOKEN_COOKIE);
            }
            return;
        }
        clearCookie(ACCESS_TOKEN_COOKIE);
        await delay(100);
    },
};
