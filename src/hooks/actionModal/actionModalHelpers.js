import { isParamVisible } from '../../utils/visibilityRules';

function isEmptyValue(value) {
    return value === undefined
        || value === null
        || value === ''
        || (Array.isArray(value) && value.length === 0);
}

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeOptions(options = []) {
    const list = Array.isArray(options) ? options : [];
    return list
        .map((option) => {
            if (option && typeof option === 'object') {
                const value = option.value ?? option.label;
                const label = option.label ?? option.value;
                return {
                    value: String(value ?? ''),
                    label: String(label ?? value ?? ''),
                };
            }
            const text = String(option ?? '');
            return { value: text, label: text };
        })
        .filter((option) => option.value);
}

function getSourceTemplateKeys(source = '') {
    return (String(source || '').match(/\{([^}]+)\}/g) || [])
        .map((token) => token.replace(/[{}]/g, '').trim())
        .filter(Boolean);
}

export function buildDropdownDependencyKey(action, values) {
    if (!action?.params?.length) return '';

    return action.params
        .filter((param) => param.type === 'dropdown-api')
        .map((param) => {
            if (!isParamVisible(param, values)) return `${param.name}:hidden`;

            const dependencyKeys = new Set(asArray(param.dependsOn));
            if (param.query && typeof param.query === 'object') {
                Object.values(param.query).forEach((valueKey) => {
                    if (valueKey) dependencyKeys.add(String(valueKey));
                });
            }
            getSourceTemplateKeys(param.source).forEach((key) => dependencyKeys.add(key));

            const snapshot = [...dependencyKeys]
                .filter(Boolean)
                .sort()
                .map((key) => `${key}=${JSON.stringify(values?.[key] ?? '')}`)
                .join('|');

            return `${param.name}:${snapshot}`;
        })
        .join('||');
}

export function buildInitialValues(action, initialValues = {}) {
    const base = { ...(initialValues || {}) };
    if (!action?.params?.length) return base;

    action.params.forEach((param) => {
        if (!isEmptyValue(base[param.name])) return;

        if (Object.prototype.hasOwnProperty.call(param, 'defaultValue')) {
            base[param.name] = param.defaultValue;
            return;
        }

        if (param.type === 'dropdown') {
            const options = normalizeOptions(param.options || []);
            if (options.length === 1) {
                base[param.name] = options[0].value;
            }
        }
    });

    return base;
}
