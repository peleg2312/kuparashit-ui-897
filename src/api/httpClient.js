import axios from 'axios';
import {
    ACCESS_TOKEN_COOKIE,
    API_TIMEOUT_MS,
    EXCH_API_BASE_URL,
    KPR_API_BASE_URL,
    MAIN_API_BASE_URL,
} from './config';
import { getCookie } from './cookies';

function withBearerToken(config) {
    const token = getCookie(ACCESS_TOKEN_COOKIE);
    if (!token) return config;

    const headers = config.headers || {};
    if (typeof headers.set === 'function') {
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    } else if (!headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${token}`;
    }

    config.headers = headers;
    return config;
}

export function createHttpClient(baseURL) {
    const client = axios.create({
        baseURL,
        withCredentials: true,
        timeout: API_TIMEOUT_MS,
    });

    client.interceptors.request.use(withBearerToken);

    return client;
}

export const mainHttp = createHttpClient(MAIN_API_BASE_URL);
export const kprHttp = createHttpClient(KPR_API_BASE_URL);
export const exchHttp = createHttpClient(EXCH_API_BASE_URL);
