import { http, runApiRequest, runApiRequestNoData } from './client';

export const authApi = {
    async loginLocal({ username, password }) {
        return runApiRequest('auth.loginLocal', () => http.main.post('/auth/login/local', { username, password }));
    },

    async loginAdfs() {
        return runApiRequest('auth.loginAdfs', () => http.main.post('/auth/login/adfs'));
    },

    async getSession() {
        return runApiRequest('auth.getSession', () => http.main.get('/auth/session'));
    },

    async getPermissions(teamIds) {
        return runApiRequest('auth.getPermissions', () => http.main.get('/auth/permissions', {
                params: { teams: teamIds },
            }));
    },

    async logout() {
        return runApiRequestNoData('auth.logout', () => http.main.post('/auth/logout'));
    },
};
