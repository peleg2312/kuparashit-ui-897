import { exchApi, kprApi, mainApi } from '../api';

const dropdownApiByName = {
    main: mainApi,
    kpr: kprApi,
    exch: exchApi,
};

const DROPDOWN_CACHE_TTL_MS = 30_000;
const DROPDOWN_RESPONSE_CACHE = new Map();
const DROPDOWN_INFLIGHT_REQUESTS = new Map();

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

function getTemplateKeys(path) {
    return new Set(
        (String(path || '').match(/\{([^}]+)\}/g) || [])
            .map((token) => token.replace(/[{}]/g, '').trim())
            .filter(Boolean),
    );
}

function buildQueryParams(param, values, sourcePath = '') {
    const templateKeys = getTemplateKeys(sourcePath);

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
        if (templateKeys.has(key)) return {};
        return { [key]: normalizeDependencyValue(values[dependencies[0]]) };
    }

    const params = {};
    dependencies.forEach((dependencyKey) => {
        if (templateKeys.has(dependencyKey)) return;
        const rawValue = values[dependencyKey];
        if (!isEmpty(rawValue)) {
            params[dependencyKey] = normalizeDependencyValue(rawValue);
        }
    });
    return params;
}

function resolveTemplateValue(key, values) {
    if (!values) return '';
    if (values[key] != null && values[key] !== '') return values[key];

    const aliasMap = {
        vc: 'vc_name',
        vcenter: 'vc_name',
        ds_cluster: 'ds_cluster_name',
        esx_cluster: 'esx_cluster_name',
    };
    const aliasKey = aliasMap[key];
    if (aliasKey && values[aliasKey] != null && values[aliasKey] !== '') {
        return values[aliasKey];
    }

    return '';
}

function resolvePathTemplate(path, values) {
    return String(path || '').replace(/\{([^}]+)\}/g, (_full, key) => (
        encodeURIComponent(String(resolveTemplateValue(String(key), values)))
    ));
}

function resolveDropdownApi(action, param) {
    const apiName = param?.sourceApi || action?.sourceApi || action?.api || 'main';
    return dropdownApiByName[apiName] || mainApi;
}

function resolveDropdownApiName(action, param) {
    return param?.sourceApi || action?.sourceApi || action?.api || 'main';
}

function buildQueryCacheKey(queryParams = {}) {
    const keys = Object.keys(queryParams || {}).sort();
    return keys
        .map((key) => {
            const value = queryParams[key];
            if (Array.isArray(value)) return `${key}=${value.join(',')}`;
            return `${key}=${String(value ?? '')}`;
        })
        .join('&');
}

function buildDropdownRequestKey(apiName, sourcePath, queryParams) {
    return `${apiName}|${sourcePath}|${buildQueryCacheKey(queryParams)}`;
}

function getCachedDropdownResponse(requestKey) {
    const cached = DROPDOWN_RESPONSE_CACHE.get(requestKey);
    if (!cached) return null;
    if ((Date.now() - cached.ts) > DROPDOWN_CACHE_TTL_MS) {
        DROPDOWN_RESPONSE_CACHE.delete(requestKey);
        return null;
    }
    return cached.value;
}

function setCachedDropdownResponse(requestKey, value) {
    DROPDOWN_RESPONSE_CACHE.set(requestKey, { value, ts: Date.now() });
}

async function fetchDropdownOptionsCached({
    apiService,
    apiName,
    sourcePath,
    queryParams,
}) {
    const requestKey = buildDropdownRequestKey(apiName, sourcePath, queryParams);
    const cached = getCachedDropdownResponse(requestKey);
    if (cached) return cached;

    const inFlight = DROPDOWN_INFLIGHT_REQUESTS.get(requestKey);
    if (inFlight) return inFlight;

    const requestPromise = apiService
        .getDropdownOptions(sourcePath, queryParams)
        .then((result) => {
            setCachedDropdownResponse(requestKey, result);
            return result;
        })
        .finally(() => {
            DROPDOWN_INFLIGHT_REQUESTS.delete(requestKey);
        });

    DROPDOWN_INFLIGHT_REQUESTS.set(requestKey, requestPromise);
    return requestPromise;
}

function normalizeDropdownRows(rawOptions, param, queryParams) {
    const list = Array.isArray(rawOptions) ? rawOptions : [];
    const optionField = param?.optionField;
    const optionValueField = param?.optionValueField || optionField;
    const optionLabelField = param?.optionLabelField || optionValueField;

    if (!optionField && !optionValueField && !optionLabelField) {
        return list;
    }

    const filteredRows = list.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        return Object.entries(queryParams || {}).every(([key, value]) => {
            if (value == null || value === '') return true;
            return String(row[key] ?? '') === String(value);
        });
    });

    return filteredRows.map((row) => {
        const value = row?.[optionValueField];
        const label = row?.[optionLabelField] ?? value;
        return {
            value: String(value ?? ''),
            label: String(label ?? ''),
        };
    }).filter((item) => item.value);
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

        const dropdownApi = resolveDropdownApi(action, param);
        const apiName = resolveDropdownApiName(action, param);
        const sourcePath = resolvePathTemplate(param.source, values);
        if (!sourcePath) return [param.name, []];

        if (!hasDependencies) {
            const options = await fetchDropdownOptionsCached({
                apiService: dropdownApi,
                apiName,
                sourcePath,
                queryParams: {},
            });
            const normalized = normalizeDropdownRows(options, param, {});
            return [param.name, normalized];
        }

        const hasMissingDependency = dependencies.some((dependencyKey) => isEmpty(values[dependencyKey]));
        if (hasMissingDependency) return [param.name, []];

        const queryParams = buildQueryParams(param, values, param.source);
        const options = await fetchDropdownOptionsCached({
            apiService: dropdownApi,
            apiName,
            sourcePath,
            queryParams,
        });
        const normalized = normalizeDropdownRows(options, param, queryParams);
        return [param.name, Array.isArray(normalized) ? normalized : []];
    }));

    const mapped = {};
    entries.forEach(([key, value]) => {
        if (value !== null) mapped[key] = value;
    });
    return mapped;
}
