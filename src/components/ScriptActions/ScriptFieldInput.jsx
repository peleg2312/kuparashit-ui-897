import { HiExclamationCircle, HiPlus, HiTrash } from 'react-icons/hi';
import ActionModalSelectField from '@/components/ActionModal/ActionModalSelectField';
import { defaultValueForType } from './scriptEditorHelpers';

/**
 * Recursive field renderer for the script-run modal.
 *
 * Props:
 *   field            — the schema node (a FieldDef for top-level / sub-fields,
 *                      or an ItemTypeDef for array items).
 *   value            — the current value for this field
 *   onChange         — (newValue) => void
 *   path             — array path from the root (e.g. ['mds', 0, 'mds_name'])
 *                      used as unique keys for dropdown state.
 *   label            — display label (top-level fields use field.label;
 *                      array items override with "Item N")
 *   error            — error string for this field (leaves) or nested error tree
 *   dropdownOptions  — { [url]: optionsArray }
 *   openDropdown     — currently open dropdown path-string (or '')
 *   searchByField    — { [path]: searchTerm }
 *   menuLayoutByField — { [path]: layout }
 *   onOpenDropdownChange, onSearchChange, registerDropdownRef
 *                    — proxied from useDropdownMenuState
 */
export default function ScriptFieldInput({
    field,
    value,
    onChange,
    path,
    label,
    error,
    dropdownOptions,
    openDropdown,
    searchByField,
    menuLayoutByField,
    onOpenDropdownChange,
    onSearchChange,
    registerDropdownRef,
}) {
    const pathKey = path.join('.');
    const showLabel = label !== undefined ? label : (field.label || field.name);

    // -------- leaf: text --------
    if (field.type === 'text') {
        return (
            <FieldWrapper label={showLabel} required={field.required} error={error}>
                <input
                    className="input-field"
                    type="text"
                    placeholder={`Enter ${(showLabel || 'value').toLowerCase()}...`}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            </FieldWrapper>
        );
    }

    // -------- leaf: number --------
    if (field.type === 'number') {
        return (
            <FieldWrapper label={showLabel} required={field.required} error={error}>
                <input
                    className="input-field"
                    type="number"
                    placeholder={`${field.min ?? 0} - ${field.max ?? 'max'}`}
                    min={field.min}
                    max={field.max}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                />
            </FieldWrapper>
        );
    }

    // -------- leaf: toggle --------
    if (field.type === 'toggle') {
        return (
            <FieldWrapper label={showLabel} required={field.required} error={error}>
                <label className="toggle-wrapper">
                    <input
                        type="checkbox"
                        className="toggle-input"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                    <span className="toggle-label">{value ? 'Yes' : 'No'}</span>
                </label>
            </FieldWrapper>
        );
    }

    // -------- leaf: dropdown-api --------
    if (field.type === 'dropdown-api') {
        const rawOptions = dropdownOptions?.[pathKey] || dropdownOptions?.[field.url] || [];
        const isOpen = openDropdown === pathKey;
        return (
            <FieldWrapper label={showLabel} required={field.required} error={error}>
                <ActionModalSelectField
                    param={{ name: pathKey, label: showLabel, required: field.required }}
                    values={{}}
                    value={value ?? ''}
                    rawOptions={rawOptions}
                    isOpen={isOpen}
                    searchTerm={searchByField?.[pathKey] || ''}
                    menuLayout={menuLayoutByField?.[pathKey]}
                    onChange={(v) => onChange(v)}
                    onOpenChange={(open) => onOpenDropdownChange(open ? pathKey : '')}
                    onSearchChange={(term) => onSearchChange(pathKey, term)}
                    registerRef={(node) => registerDropdownRef(pathKey, node)}
                />
            </FieldWrapper>
        );
    }

    // -------- object: nested form --------
    if (field.type === 'object') {
        const objValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const subFields = field.fields || [];
        return (
            <FieldWrapper label={showLabel} required={field.required} error={typeof error === 'string' ? error : undefined}>
                <div className="script-field-object">
                    {subFields.length === 0 && (
                        <p className="script-field-object__empty">(no sub-fields defined)</p>
                    )}
                    {subFields.map((sub) => (
                        <ScriptFieldInput
                            key={sub.name}
                            field={sub}
                            value={objValue[sub.name]}
                            onChange={(newVal) => onChange({ ...objValue, [sub.name]: newVal })}
                            path={[...path, sub.name]}
                            error={error?.[sub.name]}
                            dropdownOptions={dropdownOptions}
                            openDropdown={openDropdown}
                            searchByField={searchByField}
                            menuLayoutByField={menuLayoutByField}
                            onOpenDropdownChange={onOpenDropdownChange}
                            onSearchChange={onSearchChange}
                            registerDropdownRef={registerDropdownRef}
                        />
                    ))}
                </div>
            </FieldWrapper>
        );
    }

    // -------- array --------
    if (field.type === 'array') {
        const arrValue = Array.isArray(value) ? value : [];
        const itemType = field.itemType || { type: 'text' };

        // All array types → list of item rows with an "Add item" button.
        const addItem = () => onChange([...arrValue, defaultValueForType(itemType)]);
        const removeAt = (idx) => onChange(arrValue.filter((_, i) => i !== idx));
        const updateAt = (idx, newVal) => {
            const next = [...arrValue];
            next[idx] = newVal;
            onChange(next);
        };

        return (
            <FieldWrapper label={showLabel} required={field.required} error={typeof error === 'string' ? error : undefined}>
                <div className="script-field-array">
                    {arrValue.length === 0 && (
                        <p className="script-field-array__empty">(no items — click below to add)</p>
                    )}
                    {arrValue.map((item, idx) => (
                        <div key={idx} className="script-field-array__item">
                            <div className="script-field-array__item-header">
                                <span className="script-field-array__item-title">Item {idx + 1}</span>
                                <button
                                    type="button"
                                    className="btn-icon btn-icon-danger"
                                    onClick={() => removeAt(idx)}
                                    aria-label={`Remove item ${idx + 1}`}
                                >
                                    <HiTrash size={14} />
                                </button>
                            </div>
                            <ScriptFieldInput
                                field={itemType}
                                value={item}
                                onChange={(v) => updateAt(idx, v)}
                                path={[...path, idx]}
                                label=""    // suppress label on items, parent shows it
                                error={error?.items?.[idx] ?? error?.[idx]}
                                dropdownOptions={dropdownOptions}
                                openDropdown={openDropdown}
                                searchByField={searchByField}
                                menuLayoutByField={menuLayoutByField}
                                onOpenDropdownChange={onOpenDropdownChange}
                                onSearchChange={onSearchChange}
                                registerDropdownRef={registerDropdownRef}
                            />
                        </div>
                    ))}
                    <button type="button" className="btn btn-secondary btn-sm script-field-array__add" onClick={addItem}>
                        <HiPlus size={14} /> Add {(showLabel && !showLabel.endsWith('s')) ? `${showLabel}` : 'item'}
                    </button>
                </div>
            </FieldWrapper>
        );
    }

    return null;
}

function FieldWrapper({ label, required, error, children }) {
    if (label === '') {
        // suppress label entirely (used for array items)
        return (
            <>
                {children}
                {error && (
                    <span className="field-error">
                        <HiExclamationCircle size={14} /> {error}
                    </span>
                )}
            </>
        );
    }
    return (
        <div className="form-group">
            {label && (
                <label className="form-label">
                    {label}
                    {required && <span className="required-star">*</span>}
                </label>
            )}
            {children}
            {error && (
                <span className="field-error">
                    <HiExclamationCircle size={14} /> {error}
                </span>
            )}
        </div>
    );
}
