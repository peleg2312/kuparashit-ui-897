import { HiPlus, HiTrash } from 'react-icons/hi';
import {
    BACKEND_OPTIONS,
    FIELD_TYPES,
    blankField,
    blankItemType,
} from './scriptEditorHelpers';

/**
 * Renders the type-specific inputs (dropdown-api url, number min/max,
 * object sub-fields, array itemType). Shared by both ScriptEditorFieldRow
 * (which adds name/label/required around it) and the array itemType editor
 * (which renders just the type body without name/label).
 *
 * Props:
 *   node     — the field or itemType to edit (mutated via onChange)
 *   errors   — errors for this node (may include `subFields`, `itemType`)
 *   onChange — (patch) => void, where patch is a partial-merge into node
 *   depth    — for indentation styling
 */
function ScriptEditorTypeBody({ node, errors, onChange, depth }) {
    const updateField = (key, value) => onChange({ [key]: value });

    // ---- dropdown-api ----
    if (node.type === 'dropdown-api') {
        return (
            <>
                <div className="form-group script-editor-field-row__full">
                    <label className="form-label">
                        Dropdown API URL *
                        <span className="form-label__hint">(full URL, GET)</span>
                    </label>
                    <input
                        className="input-field"
                        type="url"
                        placeholder="https://api.example.com/switches/names"
                        value={node.url || ''}
                        onChange={(e) => updateField('url', e.target.value)}
                    />
                    {errors?.url && <span className="field-error">{errors.url}</span>}
                </div>
                <div className="form-group script-editor-field-row__full">
                    <label className="form-label">
                        Backend
                        <span className="form-label__hint">(auth for the dropdown request)</span>
                    </label>
                    <select
                        className="input-field"
                        value={node.backend || 'other'}
                        onChange={(e) => updateField('backend', e.target.value)}
                    >
                        {BACKEND_OPTIONS.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>
            </>
        );
    }

    // ---- number ----
    if (node.type === 'number') {
        return (
            <>
                <div className="form-group">
                    <label className="form-label">Min</label>
                    <input
                        className="input-field"
                        type="number"
                        placeholder="(optional)"
                        value={node.min ?? ''}
                        onChange={(e) => updateField('min', e.target.value)}
                    />
                    {errors?.min && <span className="field-error">{errors.min}</span>}
                </div>
                <div className="form-group">
                    <label className="form-label">Max</label>
                    <input
                        className="input-field"
                        type="number"
                        placeholder="(optional)"
                        value={node.max ?? ''}
                        onChange={(e) => updateField('max', e.target.value)}
                    />
                    {errors?.max && <span className="field-error">{errors.max}</span>}
                </div>
            </>
        );
    }

    // ---- object: nested sub-fields ----
    if (node.type === 'object') {
        const subFields = node.fields || [];
        const subErrors = errors?.subFields || [];

        const addSubField = () => onChange({ fields: [...subFields, blankField()] });
        const updateSubField = (index, key, value) => {
            const next = [...subFields];
            next[index] = { ...next[index], [key]: value };
            onChange({ fields: next });
        };
        const removeSubField = (index) =>
            onChange({ fields: subFields.filter((_, i) => i !== index) });

        return (
            <div className="form-group script-editor-field-row__full script-editor-nested">
                <div className="script-editor-nested__header">
                    <span className="script-editor-nested__title">Sub-fields</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addSubField}>
                        <HiPlus size={12} /> Add Sub-field
                    </button>
                </div>
                {subFields.length === 0 && (
                    <p className="script-editor-empty script-editor-empty--inline">
                        No sub-fields. Add one to define the object's shape.
                    </p>
                )}
                {subFields.map((sub, idx) => (
                    <ScriptEditorFieldRow
                        key={idx}
                        field={sub}
                        index={idx}
                        errors={subErrors[idx]}
                        onChange={updateSubField}
                        onRemove={removeSubField}
                        depth={depth + 1}
                    />
                ))}
            </div>
        );
    }

    // ---- array: single itemType definition ----
    if (node.type === 'array') {
        const itemType = node.itemType || blankItemType();
        const itemErrors = errors?.itemType;

        const updateItem = (patch) => {
            // If the item TYPE itself changed, reset its type-specific fields
            const next = { ...itemType, ...patch };
            if (patch.type && patch.type !== itemType.type) {
                next.url = '';
                next.backend = 'other';
                next.min = '';
                next.max = '';
                next.fields = [];
                next.itemType = null;
            }
            onChange({ itemType: next });
        };

        return (
            <div className="form-group script-editor-field-row__full script-editor-nested">
                <div className="script-editor-nested__header">
                    <span className="script-editor-nested__title">Item Type</span>
                    <span className="form-label__hint">
                        (each entry in the array is of this type)
                    </span>
                </div>
                <div className="script-editor-itemtype">
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select
                            className="input-field"
                            value={itemType.type}
                            onChange={(e) => updateItem({ type: e.target.value })}
                        >
                            {FIELD_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        {itemErrors?.type && (
                            <span className="field-error">{itemErrors.type}</span>
                        )}
                    </div>
                    <ScriptEditorTypeBody
                        node={itemType}
                        errors={itemErrors}
                        onChange={updateItem}
                        depth={depth + 1}
                    />
                </div>
            </div>
        );
    }

    // ---- text / toggle: nothing extra ----
    return null;
}

/**
 * A field row with name + label + type + required + (type-specific body).
 * Recursive: object/array types render more rows beneath them via ScriptEditorTypeBody.
 *
 * Props:
 *   field    — the field object
 *   index    — its index in the parent's fields array
 *   errors   — error object for this field (name, label, url, ..., subFields, itemType)
 *   onChange — (index, key, value) => void
 *   onRemove — (index) => void
 *   depth    — for indentation (0 = top-level)
 */
export default function ScriptEditorFieldRow({ field, index, errors, onChange, onRemove, depth = 0 }) {
    const errorAt = (key) => errors?.[key];

    // Body uses a different signature (patch-merge). Translate it to (index, key, value).
    const handleBodyChange = (patch) => {
        Object.entries(patch).forEach(([key, value]) => onChange(index, key, value));
    };

    // When the user changes the type, also reset type-specific fields
    const handleTypeChange = (nextType) => {
        if (nextType === field.type) return;
        onChange(index, 'type', nextType);
        onChange(index, 'url', '');
        onChange(index, 'backend', 'other');
        onChange(index, 'min', '');
        onChange(index, 'max', '');
        onChange(index, 'fields', []);
        onChange(index, 'itemType', null);
    };

    return (
        <div className={`script-editor-field-row depth-${Math.min(depth, 4)}`}>
            <div className="script-editor-field-row__header">
                <span className="script-editor-field-row__title">
                    {depth === 0 ? `Field ${index + 1}` : `Sub-field ${index + 1}`}
                </span>
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
                        onChange={(e) => handleTypeChange(e.target.value)}
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

                <ScriptEditorTypeBody
                    node={field}
                    errors={errors}
                    onChange={handleBodyChange}
                    depth={depth}
                />
            </div>
        </div>
    );
}
