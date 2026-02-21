export function isEmpty(value) {
    return value === undefined
        || value === ''
        || value === null
        || (Array.isArray(value) && value.length === 0);
}

export function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

export function getEmptyValueForParam(param) {
    if (param.type === 'toggle') return false;
    return param.multi ? [] : '';
}
