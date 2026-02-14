export function parseNaaList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

export function formatSizeFromGb(value) {
    const sizeGb = Number(value);
    if (!Number.isFinite(sizeGb)) return String(value ?? '');
    if (sizeGb >= 1024) {
        const sizeTb = sizeGb / 1024;
        const rounded = sizeTb >= 10 ? Math.round(sizeTb) : Number(sizeTb.toFixed(1));
        return `${rounded} TB`;
    }
    return `${Math.round(sizeGb)} GB`;
}
