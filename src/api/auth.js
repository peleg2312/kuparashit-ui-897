import { http, runApiRequest } from './client';

export const authApi = {
    async loginLocal({ username, password }) {
        return runApiRequest('auth.loginLocal', () => http.main.post('/login/local', { username, password }));
    },

    async loginAdfs({ username = 'adfs-user' } = {}) {
        return runApiRequest('auth.loginAdfs', () => http.main.post('/auth_upload', { username }));
    },

    async getPermissions(token = '') {
        const safeToken = String(token || '').trim();
        return runApiRequest('auth.getPermissions', () => http.main.get(
            `/auth_check/${encodeURIComponent(safeToken)}`,
        ));
    },

    async logout() {
        // No backend logout endpoint in this contract.
        return Promise.resolve({
            ok: true,
        });
    },
};
