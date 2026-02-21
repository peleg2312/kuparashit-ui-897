export function parseNaasInput(rawValue) {
    return [...new Set(
        String(rawValue || '')
            .split(/[,\n\s]+/g)
            .map((item) => item.trim())
            .filter(Boolean),
    )];
}

export function formatJsonOutput(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}
