import { useEffect, useMemo, useRef, useState } from 'react';
import { HiCheck, HiChevronDown, HiExclamationCircle, HiSearch, HiX } from 'react-icons/hi';
import {
    applyFieldChange,
    isParamVisible,
    loadDropdownOptions,
    validateActionValues,
} from '../../utils/actionModalHandlers';
import './ActionModal.css';

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
    return options
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

function uniqueValues(values) {
    return [...new Set(values.filter((value) => !isEmptyValue(value)))];
}

export default function ActionModal({ action, initialValues = {}, onClose, onSubmit }) {
    const [values, setValues] = useState(initialValues);
    const [dropdownOptions, setDropdownOptions] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [openDropdown, setOpenDropdown] = useState('');
    const [searchByField, setSearchByField] = useState({});
    const [menuLayoutByField, setMenuLayoutByField] = useState({});
    const dropdownRefs = useRef({});

    useEffect(() => {
        setValues(initialValues || {});
        setDropdownOptions({});
        setErrors({});
        setOpenDropdown('');
        setSearchByField({});
        setMenuLayoutByField({});
    }, [initialValues, action]);

    useEffect(() => {
        if (!action) return;

        const run = async () => {
            try {
                const loadedOptions = await loadDropdownOptions(action, values);
                setDropdownOptions((prev) => ({ ...prev, ...loadedOptions }));
            } catch {
                // Keep previously loaded options if one request fails.
            }
        };

        run();
    }, [action, values]);

    useEffect(() => {
        if (!openDropdown) return undefined;

        const handleOutsideClick = (event) => {
            const container = dropdownRefs.current[openDropdown];
            if (container && !container.contains(event.target)) {
                setOpenDropdown('');
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [openDropdown]);

    useEffect(() => {
        if (!openDropdown) return undefined;

        const updateLayout = () => {
            const container = dropdownRefs.current[openDropdown];
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const viewportPadding = 10;
            const maxPreferredHeight = Math.min(380, Math.floor(window.innerHeight * 0.5));
            const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
            const spaceAbove = rect.top - viewportPadding;
            const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(
                180,
                Math.min(maxPreferredHeight, Math.max(spaceBelow, spaceAbove)),
            );
            const left = Math.max(
                viewportPadding,
                Math.min(rect.left, window.innerWidth - viewportPadding - rect.width),
            );
            const top = openUp
                ? Math.max(viewportPadding, rect.top - maxHeight - 8)
                : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + 8);

            setMenuLayoutByField((prev) => ({
                ...prev,
                [openDropdown]: {
                    top,
                    left,
                    width: rect.width,
                    maxHeight,
                },
            }));
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('scroll', updateLayout, true);
        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('scroll', updateLayout, true);
        };
    }, [openDropdown]);

    const visibleParams = useMemo(
        () => (action ? action.params.filter((param) => isParamVisible(param, values)) : []),
        [action, values],
    );

    if (!action) return null;

    const handleChange = (name, value) => {
        setValues((prev) => applyFieldChange(prev, action, name, value));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const validate = () => {
        const nextErrors = validateActionValues(action, values);
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

    const renderOptionsSelect = (param, rawOptions) => {
        const options = normalizeOptions(rawOptions || []);
        const dependencies = asArray(param.dependsOn);
        const hasMissingDependency = dependencies.some((dependencyName) => isEmptyValue(values[dependencyName]));
        const isOpen = openDropdown === param.name;
        const searchTerm = searchByField[param.name] || '';
        const searchQuery = searchTerm.trim().toLowerCase();
        const filteredOptions = searchQuery
            ? options.filter((option) => option.label.toLowerCase().includes(searchQuery))
            : options;
        const selectedValue = values[param.name] ?? (param.multi ? [] : '');
        const selectedList = param.multi
            ? (Array.isArray(selectedValue) ? selectedValue.map((item) => String(item)) : [])
            : [];
        const selectedLabelByValue = new Map(options.map((option) => [option.value, option.label]));
        const selectedLabels = param.multi
            ? selectedList.map((value) => selectedLabelByValue.get(value) || value)
            : (selectedValue ? [selectedLabelByValue.get(String(selectedValue)) || String(selectedValue)] : []);
        const selectedText = selectedLabels.join(', ');

        const toggleOption = (optionValue) => {
            if (param.multi) {
                const nextValues = selectedList.includes(optionValue)
                    ? selectedList.filter((value) => value !== optionValue)
                    : [...selectedList, optionValue];
                handleChange(param.name, nextValues);
                return;
            }
            handleChange(param.name, optionValue);
            setOpenDropdown('');
        };

        const selectAllFiltered = () => {
            const allFiltered = filteredOptions.map((option) => option.value);
            const nextValues = uniqueValues([...selectedList, ...allFiltered]);
            handleChange(param.name, nextValues);
        };

        const clearSelection = () => {
            handleChange(param.name, param.multi ? [] : '');
        };

        const openMenu = () => {
            if (hasMissingDependency) return;
            setOpenDropdown((prev) => (prev === param.name ? '' : param.name));
        };

        const placeholder = hasMissingDependency
            ? 'Select required fields first...'
            : `Select ${param.label}...`;

        return (
            <div
                className="am-select"
                ref={(node) => {
                    if (node) dropdownRefs.current[param.name] = node;
                    else delete dropdownRefs.current[param.name];
                }}
            >
                <button
                    type="button"
                    className={`am-select-trigger ${isOpen ? 'is-open' : ''}`}
                    disabled={hasMissingDependency}
                    onClick={openMenu}
                >
                    <span className={selectedLabels.length ? 'am-select-value am-select-value--truncate' : 'am-select-placeholder'}>
                        {param.multi ? (selectedText || placeholder) : (selectedLabels[0] || placeholder)}
                    </span>
                    {param.multi && selectedLabels.length > 1 && (
                        <span className="am-select-count">{selectedLabels.length}</span>
                    )}
                    <HiChevronDown size={18} className={`am-select-chevron ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <input type="hidden" value={param.multi ? selectedList.join(',') : String(selectedValue || '')} readOnly />

                {isOpen && (
                    <div
                        className="am-select-menu glass-card"
                        style={{
                            top: menuLayoutByField[param.name]?.top,
                            left: menuLayoutByField[param.name]?.left,
                            width: menuLayoutByField[param.name]?.width,
                            '--am-menu-max-height': `${menuLayoutByField[param.name]?.maxHeight || 320}px`,
                        }}
                    >
                        <div className="am-select-search">
                            <HiSearch size={16} />
                            <input
                                className="am-select-search-input"
                                value={searchTerm}
                                onChange={(event) => setSearchByField((prev) => ({ ...prev, [param.name]: event.target.value }))}
                                placeholder={`Search ${param.label.toLowerCase()}...`}
                                autoFocus
                            />
                        </div>

                        {param.multi && (
                            <div className="am-select-actions">
                                <button type="button" className="btn btn-secondary am-select-action-btn" onClick={selectAllFiltered}>
                                    Select Filtered
                                </button>
                                <button type="button" className="btn btn-ghost am-select-action-btn" onClick={clearSelection}>
                                    Clear
                                </button>
                            </div>
                        )}

                        <div className="am-select-options">
                            {filteredOptions.length === 0 ? (
                                <div className="am-select-empty">No matching items</div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = param.multi
                                        ? selectedList.includes(option.value)
                                        : String(selectedValue) === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`am-select-option ${isSelected ? 'is-selected' : ''}`}
                                            onClick={() => toggleOption(option.value)}
                                        >
                                            <span className={`am-select-option-check ${isSelected ? 'is-selected' : ''}`}>
                                                {isSelected && <HiCheck size={14} />}
                                            </span>
                                            <span className="am-select-option-label">{option.label}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderField = (param) => {
        const currentValue = values[param.name] ?? (param.multi ? [] : '');

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
                    {visibleParams.map((param) => (
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
