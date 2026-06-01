import axios from 'axios';
import { API_CONFIG, http, runApiRequest } from './client';

export const getScripts = () => runApiRequest('getScripts', () => http.main.get('/scripts'));

export const createScript = (script) =>
    runApiRequest('createScript', () => http.main.post('/scripts', script));

export const updateScript = (id, script) =>
    runApiRequest('updateScript', () => http.main.put(`/scripts/${id}`, script));

export const deleteScript = (id) =>
    runApiRequest('deleteScript', () => http.main.delete(`/scripts/${id}`));

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(String(url || ''));

// True when `url` lives on the same origin as the configured main API backend.
// Those requests need the authenticated http.main client; everything else (random
// 3rd-party URLs the user types in) gets the bare rawClient with no credentials.
function isMainBackendUrl(url) {
    try {
        const target = new URL(url);
        const main = new URL(API_CONFIG.mainBaseUrl);
        return target.origin === main.origin;
    } catch {
        return false;
    }
}

// Fresh axios instance with NO baseURL, auth, or credentials —
// scripts can point to arbitrary URLs (https://anything.example.com/...)
const rawClient = axios.create({
    timeout: 30000,
    withCredentials: false,
});

function pickClient(url) {
    if (!isAbsoluteUrl(url)) return http.main;
    return isMainBackendUrl(url) ? http.main : rawClient;
}

export const getDropdownOptions = (url, params = {}) => {
    const client = pickClient(url);
    return runApiRequest('getDropdownOptions', () => client.get(url, { params }));
};

// Execute a script by hitting its OWN url + method directly.
// GET/DELETE send values as query params; everything else sends them as the JSON body.
export const runScriptRequest = (script, values) => {
    const url = String(script?.url || '').trim();
    const method = String(script?.method || 'POST').toUpperCase();
    if (!url) throw new Error('Script has no url.');

    const usesQueryParams = method === 'GET' || method === 'DELETE';
    const client = pickClient(url);

    return runApiRequest('runScript', () => client.request({
        url,
        method,
        params: usesQueryParams ? values : undefined,
        data: usesQueryParams ? undefined : values,
    }));
};
