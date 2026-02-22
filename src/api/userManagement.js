import { http, runApiRequest } from './client';

export const userManagementApi = {
    async getPermissions() {
        return runApiRequest(
            'userManagement.getPermissions',
            () => http.main.get('/admin/permissions'),
        );
    },

    async getGroups() {
        return runApiRequest(
            'userManagement.getGroups',
            () => http.main.get('/admin/groups'),
        );
    },

    async createGroup({ group, permissions }) {
        return runApiRequest(
            'userManagement.createGroup',
            () => http.main.post('/admin/groups', { group, permissions }),
        );
    },

    async updateGroup(groupId, { group, permissions }) {
        const encoded = encodeURIComponent(String(groupId || '').trim());
        return runApiRequest(
            'userManagement.updateGroup',
            () => http.main.put(`/admin/groups/${encoded}`, { group, permissions }),
        );
    },

    async deleteGroup(groupId) {
        const encoded = encodeURIComponent(String(groupId || '').trim());
        return runApiRequest(
            'userManagement.deleteGroup',
            () => http.main.delete(`/admin/groups/${encoded}`),
        );
    },

    async getUsers() {
        return runApiRequest(
            'userManagement.getUsers',
            () => http.main.get('/admin/users'),
        );
    },

    async createUser({ username, password, permissions, type }) {
        const payload = { username, permissions, type };
        if (password != null && String(password) !== '') {
            payload.password = password;
        }
        return runApiRequest(
            'userManagement.createUser',
            () => http.main.post('/admin/users', payload),
        );
    },

    async updateUser(userId, { username, password, permissions, type }) {
        const encoded = encodeURIComponent(String(userId || '').trim());
        const payload = { username, permissions, type };
        if (password != null && String(password) !== '') {
            payload.password = password;
        }
        return runApiRequest(
            'userManagement.updateUser',
            () => http.main.put(`/admin/users/${encoded}`, payload),
        );
    },

    async deleteUser(userId) {
        const encoded = encodeURIComponent(String(userId || '').trim());
        return runApiRequest(
            'userManagement.deleteUser',
            () => http.main.delete(`/admin/users/${encoded}`),
        );
    },
};
