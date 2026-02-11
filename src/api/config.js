export const MOCK_DELAY = 600;
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
export const ACCESS_TOKEN_COOKIE = import.meta.env.VITE_AUTH_TOKEN_COOKIE || 'access_token';
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000);

export const MAIN_API_BASE_URL = import.meta.env.VITE_MAIN_API_BASE_URL
    || import.meta.env.VITE_API_BASE_URL
    || 'http://127.0.0.1:8000';

export const KPR_API_BASE_URL = import.meta.env.VITE_KPR_API_BASE_URL
    || 'http://127.0.0.1:8001';

export const EXCH_API_BASE_URL = import.meta.env.VITE_EXCH_API_BASE_URL
    || 'http://127.0.0.1:8002';
