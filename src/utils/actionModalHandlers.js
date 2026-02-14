import { mainApi } from '../api';

function isEmpty(value) {
    return value === undefined
        || value === ''
        || value === null
        || (Array.isArray(value) && value.length === 0);
}

export function applyFieldChange(currentValues, action, name, value) {
    const next = { ...currentValues, [name]: value };
    action.params.forEach((param) => {
        if (param.dependsOn === name) {
            next[param.name] = param.multi ? [] : '';
        }
    });
    return next;
}

export function validateActionValues(action, values) {
    const errors = {};

    action.params.forEach((param) => {
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

        if (!param.dependsOn) {
            const options = await mainApi.getDropdownOptions(param.source);
            return [param.name, options];
        }

        const dependencyValue = values[param.dependsOn];
        if (!dependencyValue) return [param.name, []];

        const queryKey = param.queryKey || param.dependsOn;
        const options = await mainApi.getDropdownOptions(param.source, { [queryKey]: dependencyValue });
        return [param.name, options];
    }));

    const mapped = {};
    entries.forEach(([key, value]) => {
        if (value !== null) mapped[key] = value;
    });
    return mapped;
}
