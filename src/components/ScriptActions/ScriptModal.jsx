import { useEffect, useMemo, useState } from 'react';
import { HiExclamationCircle, HiX } from 'react-icons/hi';
import ActionModalField from '@/components/ActionModal/ActionModalField';
import { useDropdownMenuState } from '@/hooks/actionModal/useDropdownMenuState';
import { getDropdownOptions } from '@/api/scripts';
import '@/components/ActionModal/ActionModal.css';

function buildInitialValues(fields) {
    const values = {};
    for (const field of fields) {
        if (field.type === 'toggle') {
            values[field.name] = false;
        } else if (field.type === 'number') {
            values[field.name] = '';
        } else {
            values[field.name] = '';
        }
    }
    return values;
}

function validate(fields, values) {
    const errors = {};
    for (const field of fields) {
        if (!field.required) continue;
        const val = values[field.name];
        if (val === '' || val === null || val === undefined || (Array.isArray(val) && val.length === 0)) {
            errors[field.name] = `${field.label} is required.`;
        }
    }
    return errors;
}

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

    // Build a stable key from only the dependency values — only re-run when those change
    const dropdownDepKey = useMemo(() => {
        const parts = fields
            .filter((f) => f.type === 'dropdown-api')
            .map((f) => {
                const deps = Array.isArray(f.dependsOn) ? f.dependsOn : (f.dependsOn ? [f.dependsOn] : []);
                return `${f.name}:${deps.map((d) => values[d] ?? '').join(',')}`;
            });
        return parts.join('|');
    }, [fields, values]);

    useEffect(() => {
        const apiFields = fields.filter((f) => f.type === 'dropdown-api' && f.url);
        for (const field of apiFields) {
            const deps = Array.isArray(field.dependsOn)
                ? field.dependsOn
                : (field.dependsOn ? [field.dependsOn] : []);
            const hasMissingDep = deps.some((dep) => !values[dep]);
            if (hasMissingDep) continue;

            const params = {};
            for (const dep of deps) {
                params[dep] = values[dep];
            }

            getDropdownOptions(field.url, params)
                .then((data) => {
                    const list = Array.isArray(data)
                        ? data
                        : (data?.names ?? data?.data ?? data?.items ?? []);
                    setDropdownOptions((prev) => ({ ...prev, [field.name]: list }));
                })
                .catch(() => {
                    setDropdownOptions((prev) => ({ ...prev, [field.name]: [] }));
                });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dropdownDepKey]);

    const handleChange = (fieldName, value) => {
        setValues((prev) => ({ ...prev, [fieldName]: value }));
        setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    };

    const handleSubmit = async () => {
        const nextErrors = validate(fields, values);
        if (Object.keys(nextErrors).length > 0) {
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

                <div className="modal-body">
                    {fields.map((field) => (
                        <ActionModalField
                            key={field.name}
                            param={field}
                            values={values}
                            dropdownOptions={dropdownOptions}
                            error={errors[field.name]}
                            openDropdownName={openDropdown}
                            searchByField={searchByField}
                            menuLayoutByField={menuLayoutByField}
                            onFieldChange={handleChange}
                            onOpenDropdownChange={(name) => setOpenDropdown(name)}
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
