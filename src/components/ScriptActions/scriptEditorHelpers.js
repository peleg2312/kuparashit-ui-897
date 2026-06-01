export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'toggle', label: 'Toggle' },
    { value: 'dropdown-api', label: 'Dropdown (API)' },
];

export const blankField = () => ({
    name: '',
    label: '',
    type: 'text',
    required: false,
    url: '',
    min: '',
    max: '',
});

export function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function isAbsoluteHttp(value) {
    return /^https?:\/\/\S+/i.test(String(value || '').trim());
}

export function buildInitialState(script) {
    if (!script) {
        return {
            id: '',
            label: '',
            description: '',
            url: '',
            method: 'POST',
            fields: [blankField()],
        };
    }
    return {
        id: script.id || '',
        label: script.label || '',
        description: script.description || '',
        url: script.url || '',
        method: (script.method || 'POST').toUpperCase(),
        fields: (script.fields_required || []).map((f) => ({
            name: f.name || '',
            label: f.label || '',
            type: f.type || 'text',
            required: !!f.required,
            url: f.url || '',
            min: f.min ?? '',
            max: f.max ?? '',
        })),
    };
}

export function validate(state, mode) {
    const errors = {};
    if (mode === 'create' && !slugify(state.id)) errors.id = 'Script id is required.';
    if (!state.label.trim()) errors.label = 'Label is required.';
    if (!state.url.trim()) {
        errors.url = 'URL is required.';
    } else if (!isAbsoluteHttp(state.url)) {
        errors.url = 'URL must start with http:// or https://';
    }
    if (!METHODS.includes(state.method)) errors.method = 'Invalid method.';

    const fieldErrors = [];
    const seenNames = new Set();
    state.fields.forEach((field, index) => {
        const fErr = {};
        const safeName = slugify(field.name);
        if (!safeName) fErr.name = 'Required';
        else if (seenNames.has(safeName)) fErr.name = 'Duplicate';
        seenNames.add(safeName);
        if (!field.label.trim()) fErr.label = 'Required';
        if (field.type === 'dropdown-api') {
            if (!field.url.trim()) fErr.url = 'URL required for dropdown-api';
            else if (!isAbsoluteHttp(field.url)) fErr.url = 'Must start with http:// or https://';
        }
        if (field.type === 'number') {
            if (field.min !== '' && Number.isNaN(Number(field.min))) fErr.min = 'Must be a number';
            if (field.max !== '' && Number.isNaN(Number(field.max))) fErr.max = 'Must be a number';
        }
        if (Object.keys(fErr).length > 0) fieldErrors[index] = fErr;
    });
    if (fieldErrors.length > 0) errors.fields = fieldErrors;
    return errors;
}

export function buildPayload(state) {
    const fields = state.fields.map((f) => {
        const entry = {
            name: slugify(f.name),
            label: f.label.trim(),
            type: f.type,
            required: !!f.required,
        };
        if (f.type === 'dropdown-api') entry.url = f.url.trim();
        if (f.type === 'number') {
            if (f.min !== '' && f.min !== null) entry.min = Number(f.min);
            if (f.max !== '' && f.max !== null) entry.max = Number(f.max);
        }
        return entry;
    });
    return {
        id: slugify(state.id),
        label: state.label.trim(),
        description: state.description.trim(),
        url: state.url.trim(),
        method: state.method,
        fields_required: fields,
    };
}
