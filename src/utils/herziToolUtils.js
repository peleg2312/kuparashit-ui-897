import { formatHerziToolResult } from './herziHandlers';

export function buildInputPlaceholder(inputLabel) {
    const normalizedLabel = String(inputLabel || '').trim();
    if (!normalizedLabel) return 'Input';
    const [firstWord] = normalizedLabel.split(/[\s/]+/);
    return firstWord || 'Input';
}

export function buildMultiResultState(inputItems, response) {
    const resultsByItem = {};
    const orderedItems = [];

    if (Array.isArray(response)) {
        response.forEach((entry, index) => {
            const fallbackItem = inputItems[index] || '';
            const isObjectEntry = typeof entry === 'object' && entry !== null && !Array.isArray(entry);
            const rawItem = isObjectEntry ? (entry.item ?? entry.input ?? fallbackItem) : fallbackItem;
            const item = String(rawItem || '').trim();
            if (!item || resultsByItem[item]) return;

            const rawResult = isObjectEntry && 'result' in entry ? entry.result : entry;
            resultsByItem[item] = formatHerziToolResult(rawResult);
            orderedItems.push(item);
        });
    }

    if (!orderedItems.length) {
        const fallbackResult = formatHerziToolResult(response);
        inputItems.forEach((item) => {
            resultsByItem[item] = fallbackResult;
        });
        return { items: inputItems, resultsByItem };
    }

    inputItems.forEach((item) => {
        if (!(item in resultsByItem)) {
            resultsByItem[item] = 'No result returned for this item.';
            orderedItems.push(item);
        }
    });

    return { items: orderedItems, resultsByItem };
}
