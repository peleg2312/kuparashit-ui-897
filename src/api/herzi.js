import { http, runApiRequest } from './client';

export const herziApi = {
    async query(endpoint, input) {
        return runApiRequest('herzi.query', () => http.main.post(endpoint, { input }));
    },
};
