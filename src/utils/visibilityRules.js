function matchesFieldRule(rule, values = {}) {
    if (!rule || typeof rule !== 'object' || !rule.field) return null;

    const currentValue = values?.[rule.field];
    if (Object.prototype.hasOwnProperty.call(rule, 'equals')) {
        return currentValue === rule.equals;
    }
    if (Array.isArray(rule.in)) {
        return rule.in.includes(currentValue);
    }

    return null;
}

function matchesObjectRule(rule, values = {}) {
    return Object.entries(rule).every(([field, expected]) => {
        if (field === 'field' || field === 'equals' || field === 'in') return true;
        const currentValue = values?.[field];
        return Array.isArray(expected) ? expected.includes(currentValue) : currentValue === expected;
    });
}

export function isVisibleByRule(rule, values = {}) {
    if (!rule) return true;
    if (typeof rule !== 'object') return true;

    const fieldRuleResult = matchesFieldRule(rule, values);
    if (fieldRuleResult !== null) return fieldRuleResult;

    return matchesObjectRule(rule, values);
}

export function isParamVisible(param, values = {}) {
    return isVisibleByRule(param?.visibleWhen, values);
}
