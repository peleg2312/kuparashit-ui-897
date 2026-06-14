export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Leaf types — no children.
const LEAF_TYPES = ['text', 'number', 'toggle', 'dropdown-api'];
// Container types — children/itemType.
const CONTAINER_TYPES = ['object', 'array'];

export const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'toggle', label: 'Toggle' },
    { value: 'dropdown-api', label: 'Dropdown (API)' },
    { value: 'object', label: 'Object (nested)' },
    { value: 'array', label: 'Array (list)' },
];

// Same options but without 'object'/'array' if you ever want to restrict the
// itemType for arrays-of-array (currently we allow any nesting).
export const ITEM_TYPE_OPTIONS = FIELD_TYPES;

export const isLeafType = (t) => LEAF_TYPES.includes(t);
export const isContainerType = (t) => CONTAINER_TYPES.includes(t);

// Backend options for both script-level execution and dropdown-api fields.
// Names match the keys in src/api/client.js `http` object. `'other'` = no auth.
export const BACKEND_OPTIONS = [
    { value: 'other', label: 'External / Other (no auth)' },
    { value: 'main', label: 'Main' },
    { value: 'kpr', label: 'KPR' },
    { value: 'exch', label: 'EXCH' },
    { value: 'csiWallets', label: 'CSI Wallets' },
    { value: 'troubleshooter', label: 'Troubleshooter' },
];

// A blank top-level field (name + label visible to the user).
export const blankField = () => ({
    name: '',
    label: '',
    type: 'text',
    required: false,
    url: '',
    backend: 'other',  // per-field backend for dropdown-api auth
    min: '',
    max: '',
    fields: [],     // for type === 'object'
    itemType: null, // for type === 'array'
});

// A blank "item type" used as the itemType of an array.
// Items don't have name/label/required — those belong to the parent array.
export const blankItemType = () => ({
    type: 'text',
    url: '',
    backend: 'other',
    min: '',
    max: '',
    fields: [],
    itemType: null,
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

// ----- Initial state (load existing script into editor state) -----

function rehydrateField(f) {
    if (!f || typeof f !== 'object') return blankField();
    const base = {
        name: f.name || '',
        label: f.label || '',
        type: f.type || 'text',
        required: !!f.required,
        url: f.url || '',
        backend: f.backend || 'other',
        min: f.min ?? '',
        max: f.max ?? '',
        fields: [],
        itemType: null,
    };
    if (base.type === 'object') {
        base.fields = Array.isArray(f.fields) ? f.fields.map(rehydrateField) : [];
    }
    if (base.type === 'array') {
        base.itemType = f.itemType ? rehydrateItemType(f.itemType) : blankItemType();
    }
    return base;
}

function rehydrateItemType(it) {
    if (!it || typeof it !== 'object') return blankItemType();
    const base = {
        type: it.type || 'text',
        url: it.url || '',
        backend: it.backend || 'other',
        min: it.min ?? '',
        max: it.max ?? '',
        fields: [],
        itemType: null,
    };
    if (base.type === 'object') {
        base.fields = Array.isArray(it.fields) ? it.fields.map(rehydrateField) : [];
    }
    if (base.type === 'array') {
        base.itemType = it.itemType ? rehydrateItemType(it.itemType) : blankItemType();
    }
    return base;
}

export function buildInitialState(script, { defaultTeams = [] } = {}) {
    if (!script) {
        return {
            label: '',
            description: '',
            url: '',
            method: 'POST',
            backend: 'other',
            teams: [...defaultTeams],
            fields: [blankField()],
        };
    }
    return {
        label: script.label || '',
        description: script.description || '',
        url: script.url || '',
        method: (script.method || 'POST').toUpperCase(),
        backend: script.backend || 'other',
        teams: Array.isArray(script.teams) ? [...script.teams] : [],
        fields: (script.fields_required || []).map(rehydrateField),
    };
}

// ----- Validation (recursive) -----

function validateField(field, errorBucket) {
    const fErr = {};
    const safeName = slugify(field.name);
    if (!safeName) fErr.name = 'Required';
    if (!field.label?.trim()) fErr.label = 'Required';

    if (field.type === 'dropdown-api') {
        if (!field.url?.trim()) fErr.url = 'URL required for dropdown-api';
        else if (!isAbsoluteHttp(field.url)) fErr.url = 'Must start with http:// or https://';
    }
    if (field.type === 'number') {
        if (field.min !== '' && Number.isNaN(Number(field.min))) fErr.min = 'Must be a number';
        if (field.max !== '' && Number.isNaN(Number(field.max))) fErr.max = 'Must be a number';
    }
    if (field.type === 'object') {
        const subErrors = [];
        const seenNames = new Set();
        (field.fields || []).forEach((sub, idx) => {
            const sErr = validateField(sub, null);
            // dup-check sub-field names within this object
            const sName = slugify(sub.name);
            if (sName && seenNames.has(sName)) sErr.name = 'Duplicate';
            if (sName) seenNames.add(sName);
            if (Object.keys(sErr).length > 0) subErrors[idx] = sErr;
        });
        if (subErrors.length > 0) fErr.subFields = subErrors;
    }
    if (field.type === 'array') {
        const itemErr = validateItemType(field.itemType || blankItemType());
        if (Object.keys(itemErr).length > 0) fErr.itemType = itemErr;
    }

    if (errorBucket) errorBucket.push(fErr);
    return fErr;
}

function validateItemType(itemType) {
    const itErr = {};
    if (!itemType?.type) {
        itErr.type = 'Required';
        return itErr;
    }
    if (itemType.type === 'dropdown-api') {
        if (!itemType.url?.trim()) itErr.url = 'URL required';
        else if (!isAbsoluteHttp(itemType.url)) itErr.url = 'Must start with http(s)://';
    }
    if (itemType.type === 'number') {
        if (itemType.min !== '' && Number.isNaN(Number(itemType.min))) itErr.min = 'Must be a number';
        if (itemType.max !== '' && Number.isNaN(Number(itemType.max))) itErr.max = 'Must be a number';
    }
    if (itemType.type === 'object') {
        const subErrors = [];
        const seenNames = new Set();
        (itemType.fields || []).forEach((sub, idx) => {
            const sErr = validateField(sub, null);
            const sName = slugify(sub.name);
            if (sName && seenNames.has(sName)) sErr.name = 'Duplicate';
            if (sName) seenNames.add(sName);
            if (Object.keys(sErr).length > 0) subErrors[idx] = sErr;
        });
        if (subErrors.length > 0) itErr.subFields = subErrors;
    }
    if (itemType.type === 'array') {
        const inner = validateItemType(itemType.itemType || blankItemType());
        if (Object.keys(inner).length > 0) itErr.itemType = inner;
    }
    return itErr;
}

export function validate(state) {
    const errors = {};
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
        const fErr = validateField(field, null);
        const safeName = slugify(field.name);
        if (safeName && seenNames.has(safeName)) fErr.name = 'Duplicate';
        if (safeName) seenNames.add(safeName);
        if (Object.keys(fErr).length > 0) fieldErrors[index] = fErr;
    });
    if (fieldErrors.length > 0) errors.fields = fieldErrors;
    return errors;
}

// ----- Payload (recursive serialization for the API) -----

function serializeField(f) {
    const entry = {
        name: slugify(f.name),
        label: f.label.trim(),
        type: f.type,
        required: !!f.required,
    };
    if (f.type === 'dropdown-api') {
        entry.url = f.url.trim();
        entry.backend = f.backend || 'other';
    }
    if (f.type === 'number') {
        if (f.min !== '' && f.min !== null) entry.min = Number(f.min);
        if (f.max !== '' && f.max !== null) entry.max = Number(f.max);
    }
    if (f.type === 'object') {
        entry.fields = (f.fields || []).map(serializeField);
    }
    if (f.type === 'array') {
        entry.itemType = f.itemType ? serializeItemType(f.itemType) : { type: 'text' };
    }
    return entry;
}

function serializeItemType(it) {
    const entry = { type: it.type };
    if (it.type === 'dropdown-api') {
        entry.url = it.url.trim();
        entry.backend = it.backend || 'other';
    }
    if (it.type === 'number') {
        if (it.min !== '' && it.min !== null) entry.min = Number(it.min);
        if (it.max !== '' && it.max !== null) entry.max = Number(it.max);
    }
    if (it.type === 'object') {
        entry.fields = (it.fields || []).map(serializeField);
    }
    if (it.type === 'array') {
        entry.itemType = it.itemType ? serializeItemType(it.itemType) : { type: 'text' };
    }
    return entry;
}

export function buildPayload(state) {
    return {
        label: state.label.trim(),
        description: state.description.trim(),
        url: state.url.trim(),
        method: state.method,
        backend: state.backend || 'other',
        teams: Array.isArray(state.teams) ? state.teams.filter(Boolean) : [],
        fields_required: state.fields.map(serializeField),
    };
}

// ----- Runtime value helpers (used by the script-run modal) -----

// Returns a default initial value for a field/itemType at runtime
// (what the form starts with before the user types anything).
export function defaultValueForType(typeDef) {
    if (!typeDef) return '';
    switch (typeDef.type) {
        case 'text':
        case 'dropdown-api':
            return '';
        case 'number':
            return '';
        case 'toggle':
            return false;
        case 'object': {
            const obj = {};
            (typeDef.fields || []).forEach((sub) => {
                obj[sub.name] = defaultValueForType(sub);
            });
            return obj;
        }
        case 'array':
            return [];
        default:
            return '';
    }
}
