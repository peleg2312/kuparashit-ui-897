import { HiTrash } from 'react-icons/hi';
import { FIELD_TYPES } from './scriptEditorHelpers';

export default function ScriptEditorFieldRow({ field, index, errors, onChange, onRemove }) {
    const errorAt = (key) => errors?.[key];

    return (
        <div className="script-editor-field-row">
            <div className="script-editor-field-row__header">
                <span className="script-editor-field-row__title">Field {index + 1}</span>
                <button
                    type="button"
                    className="btn-icon btn-icon-danger"
                    onClick={() => onRemove(index)}
                    aria-label="Remove field"
                >
                    <HiTrash size={14} />
                </button>
            </div>

            <div className="script-editor-field-row__grid">
                <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input
                        className="input-field"
                        type="text"
                        placeholder="switch_name"
                        value={field.name}
                        onChange={(e) => onChange(index, 'name', e.target.value)}
                    />
                    {errorAt('name') && <span className="field-error">{errorAt('name')}</span>}
                </div>

                <div className="form-group">
                    <label className="form-label">Label *</label>
                    <input
                        className="input-field"
                        type="text"
                        placeholder="Switch Name"
                        value={field.label}
                        onChange={(e) => onChange(index, 'label', e.target.value)}
                    />
                    {errorAt('label') && <span className="field-error">{errorAt('label')}</span>}
                </div>

                <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                        className="input-field"
                        value={field.type}
                        onChange={(e) => onChange(index, 'type', e.target.value)}
                    >
                        {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group script-editor-required-cell">
                    <label className="toggle-wrapper">
                        <input
                            type="checkbox"
                            className="toggle-input"
                            checked={!!field.required}
                            onChange={(e) => onChange(index, 'required', e.target.checked)}
                        />
                        <span className="toggle-slider" />
                        <span className="toggle-label">Required</span>
                    </label>
                </div>

                {field.type === 'dropdown-api' && (
                    <div className="form-group script-editor-field-row__full">
                        <label className="form-label">
                            Dropdown API URL *
                            <span className="form-label__hint">(full URL, GET)</span>
                        </label>
                        <input
                            className="input-field"
                            type="url"
                            placeholder="https://api.example.com/switches/names"
                            value={field.url}
                            onChange={(e) => onChange(index, 'url', e.target.value)}
                        />
                        {errorAt('url') && <span className="field-error">{errorAt('url')}</span>}
                    </div>
                )}

                {field.type === 'number' && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Min</label>
                            <input
                                className="input-field"
                                type="number"
                                placeholder="(optional)"
                                value={field.min}
                                onChange={(e) => onChange(index, 'min', e.target.value)}
                            />
                            {errorAt('min') && <span className="field-error">{errorAt('min')}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max</label>
                            <input
                                className="input-field"
                                type="number"
                                placeholder="(optional)"
                                value={field.max}
                                onChange={(e) => onChange(index, 'max', e.target.value)}
                            />
                            {errorAt('max') && <span className="field-error">{errorAt('max')}</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
