import axios from 'axios';
import { http, runApiRequest } from './client';

// CRUD on the demo backend (always main, with auth).
export const getScripts = (team) => runApiRequest(
    'getScripts',
    () => http.main.get('/scripts', { params: team ? { team } : {} }),
);

export const createScript = (script, team) =>
    runApiRequest('createScript', () => http.main.post('/scripts', script, { params: team ? { team } : {} }));

export const updateScript = (id, script, team) =>
    runApiRequest('updateScript', () => http.main.put(`/scripts/${id}`, script, { params: team ? { team } : {} }));

export const deleteScript = (id, team) =>
    runApiRequest('deleteScript', () => http.main.delete(`/scripts/${id}`, { params: team ? { team } : {} }));

// ---- Script execution / dropdown-api ----

// Fresh axios with NO auth/credentials — used for "other" (external) URLs.
const rawClient = axios.create({
    timeout: 30000,
    withCredentials: false,
});

/**
 * Pick an axios client based on the user-chosen backend name.
 *   - 'main' | 'kpr' | 'exch' | 'csiWallets' | 'troubleshooter' | 'proactiveBlock' | 'proactiveNasa'
 *     → the matching http.* client (auth attached)
 *   - 'other' / unknown / empty → rawClient (no auth, no credentials)
 *
 * The URL is used VERBATIM (always full http(s)://) — the configured client's
 * baseURL is ignored when an absolute URL is passed.
 */
function pickClient(backend) {
    const name = String(backend || 'other');
    if (name && name !== 'other' && http[name]) return http[name];
    return rawClient;
}

/**
 * Fetch options for a dropdown-api field.
 *   url      — full URL (always GET)
 *   params   — query params (dependsOn values)
 *   backend  — which backend's auth to attach ('main', 'kpr', ..., or 'other')
 */
export const getDropdownOptions = (url, params = {}, backend = 'other') => {
    const client = pickClient(backend);
    return runApiRequest('getDropdownOptions', () => client.get(url, { params }));
};

/**
 * Execute a script by hitting its OWN url + method directly.
 * Uses the script's `backend` field to decide which client (and therefore which
 * auth token) to use.
 *   - GET/DELETE  → values go as query params
 *   - others      → values go as JSON body
 */
export const runScriptRequest = (script, values) => {
    const url = String(script?.url || '').trim();
    const method = String(script?.method || 'POST').toUpperCase();
    if (!url) throw new Error('Script has no url.');

    const usesQueryParams = method === 'GET' || method === 'DELETE';
    const client = pickClient(script?.backend);

    return runApiRequest('runScript', () => client.request({
        url,
        method,
        params: usesQueryParams ? values : undefined,
        data: usesQueryParams ? undefined : values,
    }));
};
