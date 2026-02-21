import { HiExclamationCircle } from 'react-icons/hi';
import ActionModalSelectField from './ActionModalSelectField';

function ActionModalFieldInput({ param, value, values, dropdownOptions, openDropdownName, searchByField, menuLayoutByField, onFieldChange, onOpenDropdownChange, onSearchChange, registerDropdownRef }) {
    if (param.type === 'text') {
        return (
            <input
                className="input-field"
                type={param.sensitive ? 'password' : 'text'}
                placeholder={`Enter ${param.label.toLowerCase()}...`}
                value={value}
                onChange={(event) => onFieldChange(param.name, event.target.value)}
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
                value={value}
                onChange={(event) => onFieldChange(param.name, event.target.value)}
            />
        );
    }

    if (param.type === 'dropdown' || param.type === 'dropdown-api') {
        const isOpen = openDropdownName === param.name;
        const rawOptions = param.type === 'dropdown'
            ? (param.options || [])
            : (dropdownOptions[param.name] || []);

        return (
            <ActionModalSelectField
                param={param}
                values={values}
                value={value}
                rawOptions={rawOptions}
                isOpen={isOpen}
                searchTerm={searchByField[param.name] || ''}
                menuLayout={menuLayoutByField[param.name]}
                onChange={(nextValue) => onFieldChange(param.name, nextValue)}
                onOpenChange={(nextOpen) => onOpenDropdownChange(nextOpen ? param.name : '')}
                onSearchChange={(searchTerm) => onSearchChange(param.name, searchTerm)}
                registerRef={(node) => registerDropdownRef(param.name, node)}
            />
        );
    }

    if (param.type === 'toggle') {
        return (
            <label className="toggle-wrapper">
                <input
                    type="checkbox"
                    className="toggle-input"
                    checked={!!value}
                    onChange={(event) => onFieldChange(param.name, event.target.checked)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">{value ? 'Yes' : 'No'}</span>
            </label>
        );
    }

    return null;
}

export default function ActionModalField({
    param,
    values,
    dropdownOptions,
    error,
    openDropdownName,
    searchByField,
    menuLayoutByField,
    onFieldChange,
    onOpenDropdownChange,
    onSearchChange,
    registerDropdownRef,
}) {
    const value = values[param.name] ?? (param.multi ? [] : '');

    return (
        <div className="form-group">
            <label className="form-label">
                {param.label}
                {param.required && <span className="required-star">*</span>}
            </label>
            <ActionModalFieldInput
                param={param}
                value={value}
                values={values}
                dropdownOptions={dropdownOptions}
                openDropdownName={openDropdownName}
                searchByField={searchByField}
                menuLayoutByField={menuLayoutByField}
                onFieldChange={onFieldChange}
                onOpenDropdownChange={onOpenDropdownChange}
                onSearchChange={onSearchChange}
                registerDropdownRef={registerDropdownRef}
            />
            {error && (
                <span className="field-error">
                    <HiExclamationCircle size={14} />
                    {error}
                </span>
            )}
        </div>
    );
}
