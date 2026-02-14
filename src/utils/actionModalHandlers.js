import { mainApi } from '../api';

function isEmpty(value) {
    return value === undefined
        || value === ''
        || value === null
        || (Array.isArray(value) && value.length === 0);
}

function getEmptyValueForParam(param) {
    if (param.type === 'toggle') return false;
    return param.multi ? [] : '';
}

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeDependencyValue(value) {
    if (Array.isArray(value)) return value.join(',');
    return value;
}

function buildQueryParams(param, values) {
    if (param.query && typeof param.query === 'object') {
        const params = {};
        Object.entries(param.query).forEach(([queryKey, sourceKey]) => {
            const valueKey = String(sourceKey || '').trim() || queryKey;
            const rawValue = values[valueKey];
            if (!isEmpty(rawValue)) {
                params[queryKey] = normalizeDependencyValue(rawValue);
            }
        });
        return params;
    }

    const dependencies = asArray(param.dependsOn);
    if (dependencies.length === 1) {
        const key = param.queryKey || dependencies[0];
        return { [key]: normalizeDependencyValue(values[dependencies[0]]) };
    }

    const params = {};
    dependencies.forEach((dependencyKey) => {
        const rawValue = values[dependencyKey];
        if (!isEmpty(rawValue)) {
            params[dependencyKey] = normalizeDependencyValue(rawValue);
        }
    });
    return params;
}

export function isParamVisible(param, values) {
    const rule = param?.visibleWhen;
    if (!rule) return true;

    if (rule.field) {
        const currentValue = values?.[rule.field];
        if (Object.prototype.hasOwnProperty.call(rule, 'equals')) {
            return currentValue === rule.equals;
        }
        if (Array.isArray(rule.in)) {
            return rule.in.includes(currentValue);
        }
    }

    if (typeof rule === 'object') {
        return Object.entries(rule).every(([field, expected]) => {
            if (field === 'field' || field === 'equals' || field === 'in') return true;
            const currentValue = values?.[field];
            return Array.isArray(expected) ? expected.includes(currentValue) : currentValue === expected;
        });
    }

    return true;
}

export function applyFieldChange(currentValues, action, name, value) {
    const next = { ...currentValues, [name]: value };
    action.params.forEach((param) => {
        const dependencies = asArray(param.dependsOn);
        if (dependencies.includes(name)) {
            next[param.name] = getEmptyValueForParam(param);
        }
    });
    action.params.forEach((param) => {
        if (!isParamVisible(param, next)) {
            next[param.name] = getEmptyValueForParam(param);
        }
    });
    return next;
}

export function validateActionValues(action, values) {
    const errors = {};

    action.params.forEach((param) => {
        if (!isParamVisible(param, values)) return;
        const value = values[param.name];
        if (param.required && isEmpty(value)) {
            errors[param.name] = `${param.label} is required`;
        }
        if (param.type === 'number' && value !== '' && value != null) {
            const number = Number(value);
            if (param.min != null && number < param.min) errors[param.name] = `Min value is ${param.min}`;
            if (param.max != null && number > param.max) errors[param.name] = `Max value is ${param.max}`;
        }
    });

    return errors;
}

export async function loadDropdownOptions(action, values) {
    if (!action) return {};

    const entries = await Promise.all(action.params.map(async (param) => {
        if (param.type !== 'dropdown-api') return [param.name, null];
        if (!isParamVisible(param, values)) return [param.name, []];

        const dependencies = asArray(param.dependsOn);
        const hasDependencies = dependencies.length > 0;

        if (!hasDependencies) {
            const options = await mainApi.getDropdownOptions(param.source);
            return [param.name, options];
        }

        const hasMissingDependency = dependencies.some((dependencyKey) => isEmpty(values[dependencyKey]));
        if (hasMissingDependency) return [param.name, []];

        const queryParams = buildQueryParams(param, values);
        const options = await mainApi.getDropdownOptions(param.source, queryParams);
        return [param.name, Array.isArray(options) ? options : []];
    }));

    const mapped = {};
    entries.forEach(([key, value]) => {
        if (value !== null) mapped[key] = value;
    });
    return mapped;
}
