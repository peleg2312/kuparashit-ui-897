import { useEffect, useMemo, useState } from 'react';
import { HiExclamationCircle, HiX } from 'react-icons/hi';
import { useDropdownMenuState } from '@/hooks/actionModal/useDropdownMenuState';
import { getDropdownOptions } from '@/api/scripts';
import ScriptFieldInput from './ScriptFieldInput';
import { defaultValueForType } from './scriptEditorHelpers';
import '@/components/ActionModal/ActionModal.css';

// ----- helpers (recursive) -----

function buildInitialValues(fields) {
    const values = {};
    for (const field of fields || []) {
        values[field.name] = defaultValueForType(field);
    }
    return values;
}

// Recursively check required fields. Returns an error tree shaped like the values.
function validateValues(fields, values) {
    const errors = {};
    for (const field of fields || []) {
        const err = validateOne(field, values?.[field.name]);
        if (err !== null) errors[field.name] = err;
    }
    return Object.keys(errors).length > 0 ? errors : null;
}

function validateOne(field, value) {
    const isEmpty = value === '' || value === null || value === undefined
        || (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
        return `${field.label} is required.`;
    }

    if (field.type === 'object') {
        const subErr = validateValues(field.fields || [], value || {});
        return subErr;
    }
    if (field.type === 'array') {
        if (!Array.isArray(value) || value.length === 0) return null;
        const itemType = field.itemType || { type: 'text' };
        const itemErrors = [];
        value.forEach((item, idx) => {
            const itemErr = validateOne({ ...itemType, required: true }, item);
            if (itemErr !== null) itemErrors[idx] = itemErr;
        });
        return itemErrors.length > 0 ? { items: itemErrors } : null;
    }

    return null;
}

// Walk the schema (including nested arrays/objects) and collect every
// dropdown-api node with its runtime path, so we can fetch options for each.
function collectDropdownApiNodes(fields, basePath = []) {
    const out = [];
    for (const field of fields || []) {
        const fieldPath = [...basePath, field.name];
        if (field.type === 'dropdown-api' && field.url) {
            out.push({ field, path: fieldPath });
        }
        if (field.type === 'object' && field.fields) {
            out.push(...collectDropdownApiNodes(field.fields, fieldPath));
        }
        // For arrays-of-dropdown-api or arrays-of-object-with-dropdown-api,
        // we'd need runtime instances. Skip for now — supports top-level + object only.
    }
    return out;
}

// -----

export default function ScriptModal({ script, onClose, onSubmit }) {
    const fields = script?.fields_required ?? [];

    const [values, setValues] = useState(() => buildInitialValues(fields));
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dropdownOptions, setDropdownOptions] = useState({});

    const {
        openDropdown,
        searchByField,
        menuLayoutByField,
        setOpenDropdown,
        setSearchValue,
        registerDropdownRef,
    } = useDropdownMenuState();

    // All dropdown-api fields at the top level + inside top-level objects
    const dropdownNodes = useMemo(() => collectDropdownApiNodes(fields), [fields]);

    // Stable key for refetching when any depended-on value changes
    const dropdownDepKey = useMemo(() => {
        return dropdownNodes.map(({ field, path }) => {
            const deps = Array.isArray(field.dependsOn) ? field.dependsOn : (field.dependsOn ? [field.dependsOn] : []);
            // dep values are looked up at the same level the dropdown lives
            const parentPath = path.slice(0, -1);
            const parentValues = parentPath.reduce((acc, key) => (acc?.[key] ?? {}), values);
            return `${path.join('.')}:${deps.map((d) => parentValues?.[d] ?? '').join(',')}`;
        }).join('|');
    }, [dropdownNodes, values]);

    useEffect(() => {
        for (const { field, path } of dropdownNodes) {
            const deps = Array.isArray(field.dependsOn) ? field.dependsOn : (field.dependsOn ? [field.dependsOn] : []);
            const parentPath = path.slice(0, -1);
            const parentValues = parentPath.reduce((acc, key) => (acc?.[key] ?? {}), values);
            const hasMissingDep = deps.some((dep) => !parentValues?.[dep]);
            if (hasMissingDep) continue;

            const params = {};
            for (const dep of deps) params[dep] = parentValues[dep];

            const pathKey = path.join('.');
            getDropdownOptions(field.url, params, field.backend)
                .then((data) => {
                    const list = Array.isArray(data)
                        ? data
                        : (data?.names ?? data?.data ?? data?.items ?? []);
                    setDropdownOptions((prev) => ({ ...prev, [pathKey]: list }));
                })
                .catch(() => {
                    setDropdownOptions((prev) => ({ ...prev, [pathKey]: [] }));
                });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dropdownDepKey]);

    const handleFieldChange = (fieldName, newValue) => {
        setValues((prev) => ({ ...prev, [fieldName]: newValue }));
        // Clear error for this field on any change
        setErrors((prev) => {
            if (!prev[fieldName]) return prev;
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
    };

    const handleSubmit = async () => {
        const nextErrors = validateValues(fields, values);
        if (nextErrors) {
            setErrors(nextErrors);
            return;
        }
        setSubmitError('');
        setSubmitting(true);
        try {
            await onSubmit(values);
        } catch (error) {
            const msg = error?.cause?.response?.data?.detail || error?.message || 'Request failed.';
            setSubmitError(String(msg));
        } finally {
            setSubmitting(false);
        }
    };

    if (!script) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content action-modal script-run-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header script-modal-header">
                    <div className="script-modal-header__text">
                        <h2 className="modal-title">{script.label}</h2>
                        {script.description && (
                            <p className="action-modal__subtitle">{script.description}</p>
                        )}
                    </div>
                    <button className="btn-icon script-modal-close" onClick={onClose} aria-label="Close">
                        <HiX size={18} />
                    </button>
                </div>

                <div className="modal-body script-run-body">
                    {fields.length === 0 && (
                        <p className="script-run-empty">(this script takes no input fields)</p>
                    )}
                    {fields.map((field) => (
                        <ScriptFieldInput
                            key={field.name}
                            field={field}
                            value={values[field.name]}
                            onChange={(v) => handleFieldChange(field.name, v)}
                            path={[field.name]}
                            error={errors[field.name]}
                            dropdownOptions={dropdownOptions}
                            openDropdown={openDropdown}
                            searchByField={searchByField}
                            menuLayoutByField={menuLayoutByField}
                            onOpenDropdownChange={setOpenDropdown}
                            onSearchChange={setSearchValue}
                            registerDropdownRef={registerDropdownRef}
                        />
                    ))}

                    {submitError && (
                        <span className="field-error">
                            <HiExclamationCircle size={14} />
                            {submitError}
                        </span>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Running...' : 'Execute'}
                    </button>
                </div>
            </div>
        </div>
    );
}
