import axios from 'axios';

export const API_CONFIG = {
    accessTokenCookie: import.meta.env.VITE_AUTH_TOKEN_COOKIE || 'access_token',
    sessionStorageKey: import.meta.env.VITE_AUTH_SESSION_KEY || 'kupa_session_v2',
    timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000),
    troubleshooterTimeoutMs: Number(import.meta.env.VITE_TROUBLESHOOTER_TIMEOUT_MS || 90000),
    mainApiBearerToken: String(
        import.meta.env.VITE_MAIN_API_BEARER_TOKEN
        || import.meta.env.VITE_MAIN_API_TOKEN
        || '',
    ).trim(),
    mainBaseUrl: import.meta.env.VITE_MAIN_API_BASE_URL
        || import.meta.env.VITE_API_BASE_URL
        || 'http://localhost:8000',
};

API_CONFIG.kprBaseUrl = import.meta.env.VITE_KPR_API_BASE_URL || API_CONFIG.mainBaseUrl;
API_CONFIG.exchBaseUrl = import.meta.env.VITE_EXCH_API_BASE_URL || API_CONFIG.mainBaseUrl;
API_CONFIG.troubleshooterBaseUrl = import.meta.env.VITE_TROUBLESHOOTER_API_BASE_URL || API_CONFIG.mainBaseUrl;
API_CONFIG.kprApiBearerToken = String(
    import.meta.env.VITE_KPR_API_BEARER_TOKEN
    || import.meta.env.VITE_KPR_API_TOKEN
    || API_CONFIG.mainApiBearerToken
    || '',
).trim();
API_CONFIG.exchApiBearerToken = String(
    import.meta.env.VITE_EXCH_API_BEARER_TOKEN
    || import.meta.env.VITE_EXCH_API_TOKEN
    || API_CONFIG.mainApiBearerToken
    || '',
).trim();
API_CONFIG.troubleshooterApiBearerToken = String(
    import.meta.env.VITE_TROUBLESHOOTER_API_BEARER_TOKEN
    || import.meta.env.VITE_TROUBLESHOOTER_API_TOKEN
    || API_CONFIG.mainApiBearerToken
    || '',
).trim();

function getCookie(name) {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length < 2) return '';
    return decodeURIComponent(parts.pop().split(';').shift() || '');
}

function getStoredToken() {
    if (typeof window === 'undefined') return '';
    try {
        const raw = window.localStorage.getItem(API_CONFIG.sessionStorageKey);
        if (!raw) return '';
        const parsed = JSON.parse(raw);
        return String(parsed?.token || '').trim();
    } catch {
        return '';
    }
}

function setAuthorizationHeader(headers, token) {
    if (!token) return headers;

    if (headers && typeof headers.set === 'function') {
        headers.set('Authorization', `Bearer ${token}`);
        return headers;
    }

    const next = headers || {};
    next.Authorization = `Bearer ${token}`;
    return next;
}

function createHttpClient(baseURL, {
    withAuth = true,
    timeoutMs = API_CONFIG.timeoutMs,
    bearerToken = '',
} = {}) {
    const client = axios.create({
        baseURL,
        withCredentials: true,
        timeout: Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : API_CONFIG.timeoutMs,
    });

    if (withAuth) {
        client.interceptors.request.use((config) => {
            if (bearerToken) {
                config.headers = setAuthorizationHeader(config.headers, bearerToken);
                return config;
            }

            const token = getStoredToken() || getCookie(API_CONFIG.accessTokenCookie);
            if (!token) return config;

            const headers = config.headers || {};
            if (typeof headers.set === 'function' && (headers.has('Authorization') || headers.has('authorization'))) {
                config.headers = headers;
                return config;
            }

            if (headers.Authorization || headers.authorization) {
                config.headers = headers;
                return config;
            }

            config.headers = setAuthorizationHeader(headers, token);
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
        if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
            return response.data;
        }
        return response;
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
    main: createHttpClient(API_CONFIG.mainBaseUrl, {
        withAuth: true,
        bearerToken: API_CONFIG.mainApiBearerToken,
    }),
    kpr: createHttpClient(API_CONFIG.kprBaseUrl, {
        withAuth: true,
        bearerToken: API_CONFIG.kprApiBearerToken,
    }),
    exch: createHttpClient(API_CONFIG.exchBaseUrl, {
        withAuth: true,
        bearerToken: API_CONFIG.exchApiBearerToken,
    }),
    troubleshooter: createHttpClient(API_CONFIG.troubleshooterBaseUrl, {
        withAuth: true,
        timeoutMs: API_CONFIG.troubleshooterTimeoutMs,
        bearerToken: API_CONFIG.troubleshooterApiBearerToken,
    }),
};
