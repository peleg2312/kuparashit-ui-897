import { http, runApiRequest } from './client';

export const kprApi = {
    async executeAction(endpoint, payload = {}) {
        return runApiRequest('kpr.executeAction', () => http.kpr.post(endpoint, payload));
    },
};
