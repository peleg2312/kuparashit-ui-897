import { http, runApiRequest } from './client';

export const exchApi = {
    async executeAction(endpoint, payload = {}) {
        return runApiRequest('exch.executeAction', () => http.exch.post(endpoint, payload));
    },
};
