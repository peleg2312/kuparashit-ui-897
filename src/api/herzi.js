import { http, runApiRequest } from './client';

function normalizeHerziInput(input) {
    if (Array.isArray(input)) {
        return input.map((item) => String(item || '').trim()).filter(Boolean).join(',');
    }
    return String(input || '').trim();
}

export const herziApi = {
    async query(endpoint, input) {
        const normalizedInput = normalizeHerziInput(input);
        return runApiRequest('herzi.query', () => http.main.get(endpoint, {
            params: { 'data_list[]': normalizedInput },
        }));
    },
};
