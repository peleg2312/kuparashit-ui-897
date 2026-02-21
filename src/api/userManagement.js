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

    async createGroup({ name, permissionKeys }) {
        return runApiRequest(
            'userManagement.createGroup',
            () => http.main.post('/admin/groups', { name, permissionKeys }),
        );
    },

    async updateGroup(groupName, { permissionKeys }) {
        const encoded = encodeURIComponent(String(groupName || '').trim());
        return runApiRequest(
            'userManagement.updateGroup',
            () => http.main.put(`/admin/groups/${encoded}`, { permissionKeys }),
        );
    },

    async deleteGroup(groupName) {
        const encoded = encodeURIComponent(String(groupName || '').trim());
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

    async createUser({ username, password, permissionKeys }) {
        return runApiRequest(
            'userManagement.createUser',
            () => http.main.post('/admin/users', { username, password, permissionKeys }),
        );
    },

    async updateUser(userRef, { permissionKeys, password }) {
        const encoded = encodeURIComponent(String(userRef || '').trim());
        return runApiRequest(
            'userManagement.updateUser',
            () => http.main.put(`/admin/users/${encoded}`, { permissionKeys, password }),
        );
    },

    async deleteUser(userRef) {
        const encoded = encodeURIComponent(String(userRef || '').trim());
        return runApiRequest(
            'userManagement.deleteUser',
            () => http.main.delete(`/admin/users/${encoded}`),
        );
    },
};
