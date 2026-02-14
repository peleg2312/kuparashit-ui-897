export function normalizeHerziInput(input) {
    return String(input || '').trim();
}

export function formatHerziToolResult(result) {
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}
