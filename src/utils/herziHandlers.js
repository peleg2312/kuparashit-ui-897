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
