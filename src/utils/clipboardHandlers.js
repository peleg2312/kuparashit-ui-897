export async function copyTextToClipboard(text) {
    if (!text) return false;
    await navigator.clipboard.writeText(text);
    return true;
}

export async function copyListToClipboard(values = [], separator = '\n') {
    const list = Array.isArray(values) ? values.filter(Boolean) : [];
    if (!list.length) return { copied: false, count: 0 };
    await copyTextToClipboard(list.join(separator));
    return { copied: true, count: list.length };
}
