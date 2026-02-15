const fallbackNetworks = ['NesHarmin'];
const siteNames = new Set(['five', 'nova']);

const rawNetworks = String(import.meta.env.VITE_KPR_NETWORKS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !siteNames.has(item.toLowerCase()));

export const NETWORK_OPTIONS = rawNetworks.length ? rawNetworks : fallbackNetworks;

export function normalizeNetworkOptions(options) {
    return (options || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((value) => ({ value, label: value }));
}
