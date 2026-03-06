import { http, runApiRequest } from './client';

function buildTeamParams(team) {
    const safeTeam = String(team || '').trim();
    if (!safeTeam) {
        throw new Error('Team is required for catalog API requests.');
    }
    return { team: safeTeam };
}

export const objectCatalogApi = {
    async listTypes(team) {
        return runApiRequest('objectCatalog.listTypes', () => http.main.get('/catalog/types', {
            params: buildTeamParams(team),
        }));
    },

    async createType(team, payload) {
        return runApiRequest('objectCatalog.createType', () => http.main.post('/catalog/types', payload, {
            params: buildTeamParams(team),
        }));
    },

    async updateType(team, typeKey, payload) {
        const safeTypeKey = encodeURIComponent(String(typeKey || '').trim());
        return runApiRequest('objectCatalog.updateType', () => http.main.put(`/catalog/types/${safeTypeKey}`, payload, {
            params: buildTeamParams(team),
        }));
    },

    async deleteType(team, typeKey) {
        const safeTypeKey = encodeURIComponent(String(typeKey || '').trim());
        return runApiRequest('objectCatalog.deleteType', () => http.main.delete(`/catalog/types/${safeTypeKey}`, {
            params: buildTeamParams(team),
        }));
    },

    async listObjects(team, typeKey) {
        const safeTypeKey = encodeURIComponent(String(typeKey || '').trim());
        return runApiRequest('objectCatalog.listObjects', () => http.main.get(`/catalog/types/${safeTypeKey}/objects`, {
            params: buildTeamParams(team),
        }));
    },

    async createObject(team, typeKey, payload) {
        const safeTypeKey = encodeURIComponent(String(typeKey || '').trim());
        return runApiRequest('objectCatalog.createObject', () => http.main.post(`/catalog/types/${safeTypeKey}/objects`, payload, {
            params: buildTeamParams(team),
        }));
    },

    async updateObject(team, typeKey, objectId, payload) {
        const safeTypeKey = encodeURIComponent(String(typeKey || '').trim());
        const safeObjectId = encodeURIComponent(String(objectId || '').trim());
        return runApiRequest('objectCatalog.updateObject', () => http.main.put(
            `/catalog/types/${safeTypeKey}/objects/${safeObjectId}`,
            payload,
            { params: buildTeamParams(team) },
        ));
    },

    async deleteObject(team, typeKey, objectId) {
        const safeTypeKey = encodeURIComponent(String(typeKey || '').trim());
        const safeObjectId = encodeURIComponent(String(objectId || '').trim());
        return runApiRequest('objectCatalog.deleteObject', () => http.main.delete(
            `/catalog/types/${safeTypeKey}/objects/${safeObjectId}`,
            { params: buildTeamParams(team) },
        ));
    },
};

