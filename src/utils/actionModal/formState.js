import { isParamVisible } from '../visibilityRules';
import { asArray, getEmptyValueForParam, isEmpty } from './common';

/**
 * Apply a field edit in ActionModal and reset dependent/hidden params.
 *
 * @param {object} currentValues
 * @param {object} action
 * @param {string} name
 * @param {unknown} value
 * @returns {object}
 */
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

/**
 * Validate current action form values against action config.
 *
 * @param {object} action
 * @param {object} values
 * @returns {Record<string, string>}
 */
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
