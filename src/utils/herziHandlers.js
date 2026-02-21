import { API_CONFIG } from '@/api/client';

export function normalizeHerziInput(input) {
    return String(input || '').trim();
}

export function parseHerziInputList(input) {
    const normalized = normalizeHerziInput(input);
    if (!normalized) return [];

    return [...new Set(
        normalized
            .split(/[,\s]+/g)
            .map((item) => item.trim())
            .filter(Boolean),
    )];
}

export function formatHerziToolResult(result) {
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}

function normalizeHerziEndpoint(endpoint) {
    const raw = String(endpoint || '').trim();
    if (!raw) return '';
    return raw.startsWith('/') ? raw : `/${raw}`;
}

function normalizeHerziInputList(input) {
    if (Array.isArray(input)) {
        return input.map((item) => String(item || '').trim()).filter(Boolean).join(',');
    }
    return String(input || '').trim();
}

export function buildHerziQueryUrl(endpoint, input) {
    const normalizedEndpoint = normalizeHerziEndpoint(endpoint);
    if (!normalizedEndpoint) return '';

    const normalizedInput = normalizeHerziInputList(input);
    const baseUrl = String(API_CONFIG.mainBaseUrl || '').trim()
        || (typeof window !== 'undefined' ? window.location.origin : '');

    if (!baseUrl) return '';

    try {
        const url = new URL(normalizedEndpoint, baseUrl);
        if (normalizedInput) {
            url.searchParams.append('data_list[]', normalizedInput);
        }
        return url.toString();
    } catch {
        return '';
    }
}
