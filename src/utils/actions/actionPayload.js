import { isParamVisible } from '../visibilityRules';

function parseListValue(value) {
    if (Array.isArray(value)) return value;
    const text = String(value || '').trim();
    if (!text) return [];
    return [...new Set(
        text
            .split(/[,\n\s]+/g)
            .map((item) => item.trim())
            .filter(Boolean),
    )];
}

/**
 * Build the backend payload for a screen action.
 * Keeps screen config behavior (visibleWhen, list fields, number coercion) centralized.
 *
 * @param {object} action
 * @param {object} values
 * @param {object} extraPayload
 * @returns {object}
 */
export function normalizeActionPayload(action, values = {}, extraPayload = {}) {
    const payload = { ...values, ...extraPayload };
    if (!action) return payload;

    const listFieldSet = new Set(action.listFields || []);
    const paramByName = new Map((action.params || []).map((param) => [param.name, param]));
    const visibilitySource = { ...payload };

    Object.keys(payload).forEach((key) => {
        const param = paramByName.get(key);
        const value = payload[key];

        if (param && !isParamVisible(param, visibilitySource)) {
            delete payload[key];
            return;
        }

        if (param?.send === false) {
            delete payload[key];
            return;
        }

        if (listFieldSet.has(key)) {
            payload[key] = parseListValue(value);
            return;
        }

        if (param?.multi && !Array.isArray(value)) {
            payload[key] = parseListValue(value);
            return;
        }

        if (param?.type === 'number' && value !== '' && value != null) {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) payload[key] = numeric;
        }
    });

    return payload;
}
