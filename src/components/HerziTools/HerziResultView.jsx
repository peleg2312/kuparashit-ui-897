import { useMemo } from 'react';
import { HiExternalLink } from 'react-icons/hi';
import './HerziResultView.css';

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitive(value) {
    return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function normalizeHref(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw)) return `https://${raw}`;
    return '';
}

function isUrlFieldKey(key) {
    const normalized = String(key || '').trim().toLowerCase();
    if (!normalized) return false;
    return /(url|href|link|uri)/i.test(normalized);
}

function formatFieldLabel(key) {
    const raw = String(key || '').trim();
    if (!raw) return 'Value';
    return raw
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tryParseJsonString(value) {
    if (typeof value !== 'string') return { parsed: false, value };
    const trimmed = value.trim().replace(/^\uFEFF/, '');
    if (!trimmed) return { parsed: false, value };
    const likelyJson = /^(?:\{|\[)/.test(trimmed) || ['null', 'true', 'false'].includes(trimmed);
    if (!likelyJson) return { parsed: false, value };
    try {
        return { parsed: true, value: JSON.parse(trimmed) };
    } catch {
        return { parsed: false, value };
    }
}

function parseKeyValueText(value) {
    if (typeof value !== 'string') return null;
    const lines = value
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) return null;

    const parsed = {};
    let currentKey = '';
    let hasPairs = false;

    lines.forEach((line) => {
        const pairMatch = line.match(/^([^:]{1,120}):\s*(.*)$/);
        if (pairMatch) {
            const key = pairMatch[1].trim();
            if (!key) return;
            parsed[key] = pairMatch[2].trim();
            currentKey = key;
            hasPairs = true;
            return;
        }

        const listMatch = line.match(/^\d+[.)]\s*(.+)$/);
        if (listMatch && currentKey) {
            const item = listMatch[1].trim();
            const currentValue = parsed[currentKey];
            if (Array.isArray(currentValue)) {
                currentValue.push(item);
            } else if (currentValue) {
                parsed[currentKey] = [String(currentValue), item];
            } else {
                parsed[currentKey] = [item];
            }
            return;
        }

        if (!currentKey) return;
        const currentValue = parsed[currentKey];
        if (Array.isArray(currentValue)) {
            currentValue.push(line);
            return;
        }
        parsed[currentKey] = currentValue ? `${currentValue}\n${line}` : line;
    });

    return hasPairs ? parsed : null;
}

function coerceDisplayValue(value) {
    const jsonCandidate = tryParseJsonString(value);
    if (jsonCandidate.parsed) return jsonCandidate.value;
    const keyValueCandidate = parseKeyValueText(value);
    if (keyValueCandidate) return keyValueCandidate;
    return value;
}

function findFirstUrl(value) {
    if (typeof value === 'string') {
        return normalizeHref(value);
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedUrl = findFirstUrl(item);
            if (nestedUrl) return nestedUrl;
        }
        return '';
    }

    if (!isPlainObject(value)) {
        return '';
    }

    for (const [key, fieldValue] of Object.entries(value)) {
        if (isUrlFieldKey(key)) {
            const directUrl = normalizeHref(fieldValue);
            if (directUrl) return directUrl;
        }
    }

    for (const fieldValue of Object.values(value)) {
        const nestedUrl = findFirstUrl(fieldValue);
        if (nestedUrl) return nestedUrl;
    }

    return '';
}

function buildArrayField(key, value) {
    if (value.every(isPrimitive)) {
        return {
            id: key,
            label: formatFieldLabel(key),
            type: 'list',
            value: value.map((item) => String(item ?? '').trim()).filter(Boolean),
        };
    }

    return {
        id: key,
        label: formatFieldLabel(key),
        type: 'json',
        value,
    };
}

function buildField(key, value) {
    if (Array.isArray(value)) {
        return buildArrayField(key, value);
    }

    if (isPlainObject(value)) {
        return {
            id: key,
            label: formatFieldLabel(key),
            type: 'json',
            value,
        };
    }

    if (typeof value === 'boolean') {
        return {
            id: key,
            label: formatFieldLabel(key),
            type: 'boolean',
            value,
        };
    }

    if (value == null || String(value).trim() === '') {
        return {
            id: key,
            label: formatFieldLabel(key),
            type: 'empty',
            value: '-',
        };
    }

    const textValue = String(value).trim();
    const href = normalizeHref(textValue);
    if (href) {
        return {
            id: key,
            label: formatFieldLabel(key),
            type: 'url',
            value: href,
        };
    }

    return {
        id: key,
        label: formatFieldLabel(key),
        type: 'text',
        value: textValue,
    };
}

function buildFields(value) {
    if (isPlainObject(value)) {
        return Object.entries(value).map(([key, fieldValue]) => buildField(key, fieldValue));
    }

    if (Array.isArray(value)) {
        if (value.every(isPrimitive)) {
            return [buildArrayField('Values', value)];
        }
        return value.map((item, index) => buildField(`Item ${index + 1}`, item));
    }

    if (value == null || String(value).trim() === '') {
        return [];
    }

    return [buildField('Value', value)];
}

function stringifyFallback(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function FieldValue({ field, onOpenUrl }) {
    if (field.type === 'url') {
        return (
            <button
                type="button"
                className="btn btn-secondary herzi-result-url-btn"
                onClick={() => onOpenUrl(field.value)}
            >
                <HiExternalLink size={14} />
                Open URL
            </button>
        );
    }

    if (field.type === 'list') {
        if (!field.value.length) {
            return <span className="herzi-result-empty-value">-</span>;
        }
        return (
            <div className="herzi-result-list-value">
                {field.value.map((item, index) => (
                    <div key={`${field.id}-${index}`} className="herzi-result-list-row">
                        <span className="herzi-result-list-index">{index + 1}.</span>
                        <span className="herzi-result-list-item">{item}</span>
                        {normalizeHref(item) && (
                            <button
                                type="button"
                                className="btn btn-secondary herzi-result-list-url-btn"
                                onClick={() => onOpenUrl(normalizeHref(item))}
                            >
                                <HiExternalLink size={12} />
                                Open
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (field.type === 'json') {
        return (
            <pre className="herzi-result-json-value">
                {JSON.stringify(field.value, null, 2)}
            </pre>
        );
    }

    if (field.type === 'boolean') {
        return (
            <span className={`badge ${field.value ? 'badge-success' : 'badge-warning'}`}>
                {field.value ? 'True' : 'False'}
            </span>
        );
    }

    if (field.type === 'empty') {
        return <span className="herzi-result-empty-value">-</span>;
    }

    return <span className="herzi-result-text-value">{field.value}</span>;
}

export default function HerziResultView({
    value,
    responseUrl = '',
    emptyText = 'No result available.',
}) {
    const { fields, fallbackText, normalizedResponseUrl } = useMemo(() => {
        const parsedValue = coerceDisplayValue(value);
        const builtFields = buildFields(parsedValue);
        const derivedUrl = normalizeHref(responseUrl) || findFirstUrl(parsedValue);
        return {
            fields: builtFields,
            fallbackText: stringifyFallback(parsedValue),
            normalizedResponseUrl: derivedUrl,
        };
    }, [responseUrl, value]);

    const handleOpenUrl = (href) => {
        if (!href) return;
        window.open(href, '_blank', 'noopener,noreferrer');
    };

    if (!fields.length && !normalizedResponseUrl) {
        return (
            <div className="herzi-result-fallback-value">
                {fallbackText || emptyText}
            </div>
        );
    }

    return (
        <div className="herzi-result-fields">
            {normalizedResponseUrl && (
                <div className="herzi-result-field herzi-result-field--url">
                    <div className="herzi-result-field-label">Response URL</div>
                    <div className="herzi-result-field-content">
                        <button
                            type="button"
                            className="btn btn-secondary herzi-result-url-btn"
                            onClick={() => handleOpenUrl(normalizedResponseUrl)}
                        >
                            <HiExternalLink size={14} />
                            Open URL
                        </button>
                    </div>
                </div>
            )}

            {fields.map((field) => (
                <div
                    key={field.id}
                    className={[
                        'herzi-result-field',
                        (field.type === 'json' || field.type === 'list') ? 'herzi-result-field--wide' : '',
                        field.type === 'url' ? 'herzi-result-field--url' : '',
                    ].filter(Boolean).join(' ')}
                >
                    <div className="herzi-result-field-label">{field.label}</div>
                    <div className="herzi-result-field-content">
                        <FieldValue field={field} onOpenUrl={handleOpenUrl} />
                    </div>
                </div>
            ))}

            {!fields.length && (
                <div className="herzi-result-fallback-value">
                    {fallbackText || emptyText}
                </div>
            )}
        </div>
    );
}
