import { useState, useEffect } from 'react';
import { mainApi } from '../../api';
import { HiX, HiExclamationCircle } from 'react-icons/hi';
import './ActionModal.css';

export default function ActionModal({ action, initialValues = {}, onClose, onSubmit }) {
    const [values, setValues] = useState(initialValues);
    const [dropdownOptions, setDropdownOptions] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setValues(initialValues || {});
    }, [initialValues, action]);

    useEffect(() => {
        if (!action) return;

        const run = async () => {
            for (const param of action.params) {
                if (param.type !== 'dropdown-api') continue;

                const dependencyName = param.dependsOn;
                if (!dependencyName) {
                    const options = await mainApi.getDropdownOptions(param.source);
                    setDropdownOptions((prev) => ({ ...prev, [param.name]: options }));
                    continue;
                }

                const dependencyValue = values[dependencyName];
                if (!dependencyValue) {
                    setDropdownOptions((prev) => ({ ...prev, [param.name]: [] }));
                    continue;
                }

                const queryKey = param.queryKey || dependencyName;
                const options = await mainApi.getDropdownOptions(param.source, { [queryKey]: dependencyValue });
                setDropdownOptions((prev) => ({ ...prev, [param.name]: options }));
            }
        };

        run();
    }, [action, values]);

    if (!action) return null;

    const handleChange = (name, value) => {
        setValues((prev) => {
            const next = { ...prev, [name]: value };
            action.params.forEach((param) => {
                if (param.dependsOn === name) {
                    next[param.name] = param.multi ? [] : '';
                }
            });
            return next;
        });
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const validate = () => {
        const nextErrors = {};
        action.params.forEach((param) => {
            const value = values[param.name];
            if (param.required && (value === undefined || value === '' || value === null || (Array.isArray(value) && value.length === 0))) {
                nextErrors[param.name] = `${param.label} is required`;
            }
            if (param.type === 'number' && value !== '' && value != null) {
                const num = Number(value);
                if (param.min != null && num < param.min) nextErrors[param.name] = `Min value is ${param.min}`;
                if (param.max != null && num > param.max) nextErrors[param.name] = `Max value is ${param.max}`;
            }
        });
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await onSubmit(values);
        } finally {
            setSubmitting(false);
        }
    };

    const renderOptionsSelect = (param, options) => {
        const currentValue = values[param.name] || (param.multi ? [] : '');
        return (
            <select
                className="select-field"
                value={currentValue}
                multiple={!!param.multi}
                disabled={!!param.dependsOn && !values[param.dependsOn]}
                onChange={(event) => {
                    if (param.multi) {
                        const selected = Array.from(event.target.selectedOptions).map((item) => item.value);
                        handleChange(param.name, selected);
                        return;
                    }
                    handleChange(param.name, event.target.value);
                }}
            >
                {!param.multi && <option value="">Select {param.label}...</option>}
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        );
    };

    const renderField = (param) => {
        const currentValue = values[param.name] || (param.multi ? [] : '');

        if (param.type === 'text') {
            return (
                <input
                    className="input-field"
                    type={param.sensitive ? 'password' : 'text'}
                    placeholder={`Enter ${param.label.toLowerCase()}...`}
                    value={currentValue}
                    onChange={(event) => handleChange(param.name, event.target.value)}
                />
            );
        }

        if (param.type === 'number') {
            return (
                <input
                    className="input-field"
                    type="number"
                    placeholder={`${param.min || 0} - ${param.max || 'max'}`}
                    min={param.min}
                    max={param.max}
                    value={currentValue}
                    onChange={(event) => handleChange(param.name, event.target.value)}
                />
            );
        }

        if (param.type === 'dropdown') {
            return renderOptionsSelect(param, param.options || []);
        }

        if (param.type === 'dropdown-api') {
            return renderOptionsSelect(param, dropdownOptions[param.name] || []);
        }

        if (param.type === 'toggle') {
            return (
                <label className="toggle-wrapper">
                    <input
                        type="checkbox"
                        className="toggle-input"
                        checked={!!values[param.name]}
                        onChange={(event) => handleChange(param.name, event.target.checked)}
                    />
                    <span className="toggle-slider" />
                    <span className="toggle-label">{values[param.name] ? 'Yes' : 'No'}</span>
                </label>
            );
        }

        return null;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content action-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{action.label}</h2>
                        <p className="action-modal__subtitle">Fill required parameters and submit</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {action.params.map((param) => (
                        <div key={param.name} className="form-group">
                            <label className="form-label">
                                {param.label}
                                {param.required && <span className="required-star">*</span>}
                            </label>
                            {renderField(param)}
                            {errors[param.name] && (
                                <span className="field-error">
                                    <HiExclamationCircle size={14} />
                                    {errors[param.name]}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Processing...' : action.label}
                    </button>
                </div>
            </div>
        </div>
    );
}
