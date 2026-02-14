import axios from 'axios';

export const API_CONFIG = {
    accessTokenCookie: import.meta.env.VITE_AUTH_TOKEN_COOKIE || 'access_token',
    timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000),
    mainBaseUrl: import.meta.env.VITE_MAIN_API_BASE_URL
        || import.meta.env.VITE_API_BASE_URL
        || 'http://localhost:8000',
};

API_CONFIG.kprBaseUrl = import.meta.env.VITE_KPR_API_BASE_URL || API_CONFIG.mainBaseUrl;
API_CONFIG.exchBaseUrl = import.meta.env.VITE_EXCH_API_BASE_URL || API_CONFIG.mainBaseUrl;

function getCookie(name) {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length < 2) return '';
    return decodeURIComponent(parts.pop().split(';').shift() || '');
}

function createHttpClient(baseURL, { withAuth = true } = {}) {
    const client = axios.create({
        baseURL,
        withCredentials: true,
        timeout: API_CONFIG.timeoutMs,
    });

    if (withAuth) {
        client.interceptors.request.use((config) => {
            const token = getCookie(API_CONFIG.accessTokenCookie);
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
        });
    }

    return client;
}

export function buildApiError(error, action = 'api_request') {
    const serverMessage = error?.response?.data?.detail
        || error?.response?.data?.message
        || error?.message
        || 'Request failed';
    const status = error?.response?.status;
    const message = status ? `[${action}] ${status}: ${serverMessage}` : `[${action}] ${serverMessage}`;
    const wrapped = new Error(message);
    wrapped.cause = error;
    wrapped.status = status;
    return wrapped;
}

export async function runApiRequest(action, request) {
    try {
        const response = await request();
        return response.data;
    } catch (error) {
        throw buildApiError(error, action);
    }
}

export async function runApiRequestNoData(action, request) {
    try {
        await request();
    } catch (error) {
        throw buildApiError(error, action);
    }
}

export const http = {
    main: createHttpClient(API_CONFIG.mainBaseUrl, { withAuth: true }),
    kpr: createHttpClient(API_CONFIG.kprBaseUrl, { withAuth: true }),
    exch: createHttpClient(API_CONFIG.exchBaseUrl, { withAuth: false }),
};
