import { useMemo, useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';

function getActiveFields(typeDef) {
    if (!Array.isArray(typeDef?.fields)) return [];
    return typeDef.fields
        .filter((field) => !!field?.active)
        .slice()
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
}

function inputValueForField(fieldType, value) {
    if (value == null) return '';

    if (fieldType === 'boolean') {
        if (value === true) return 'true';
        if (value === false) return 'false';
        return '';
    }

    if (fieldType === 'array' || fieldType === 'dict') {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return '';
        }
    }

    return String(value);
}

function parseFieldValue(field, rawValue) {
    const fieldKey = String(field?.key || 'field');
    const type = String(field?.type || 'string');

    if (rawValue == null || rawValue === '') {
        throw new Error(`Field "${fieldKey}" is required.`);
    }

    if (type === 'number') {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
            throw new Error(`Field "${fieldKey}" must be a valid number.`);
        }
        return parsed;
    }

    if (type === 'boolean') {
        if (rawValue === 'true') return true;
        if (rawValue === 'false') return false;
        throw new Error(`Field "${fieldKey}" must be true or false.`);
    }

    if (type === 'array') {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed) || parsed.length <= 0) {
            throw new Error(`Field "${fieldKey}" must be a non-empty JSON array.`);
        }
        return parsed;
    }

    if (type === 'dict') {
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length <= 0) {
            throw new Error(`Field "${fieldKey}" must be a non-empty JSON object.`);
        }
        return parsed;
    }

    const safeValue = String(rawValue).trim();
    if (!safeValue) {
        throw new Error(`Field "${fieldKey}" is required.`);
    }
    return safeValue;
}

function buildInitialFormState(activeFields, objectData) {
    const sourceValues = objectData?.values && typeof objectData.values === 'object'
        ? objectData.values
        : {};
    const initialValues = {};

    activeFields.forEach((field) => {
        initialValues[field.key] = inputValueForField(field.type, sourceValues[field.key]);
    });

    return {
        name: String(objectData?.name || ''),
        url: String(objectData?.url || ''),
        teams: Array.isArray(objectData?.teams) ? objectData.teams.map((team) => String(team || '').trim()).filter(Boolean) : [],
        fieldValues: initialValues,
    };
}

export default function ObjectFormModal({
    mode = 'create',
    typeDef,
    objectData = null,
    saving = false,
    onSubmit,
    onClose,
}) {
    const { currentTeam, userTeams } = useTeam();
    const activeFields = useMemo(() => getActiveFields(typeDef), [typeDef]);
    const hasNameField = activeFields.some((field) => String(field?.key || '').trim().toLowerCase() === 'name');
    const hasUrlField = activeFields.some((field) => String(field?.key || '').trim().toLowerCase() === 'url');
    const customFields = activeFields.filter((field) => {
        const key = String(field?.key || '').trim().toLowerCase();
        return key !== 'name' && key !== 'url';
    });
    const visibleTeamOptions = useMemo(
        () => userTeams.map((team) => String(team?.id || '').trim()).filter(Boolean),
        [userTeams],
    );
    const initial = useMemo(
        () => buildInitialFormState(activeFields, objectData),
        [activeFields, objectData],
    );
    const [name, setName] = useState(() => initial.name);
    const [url, setUrl] = useState(() => initial.url);
    const [teams, setTeams] = useState(() => {
        if (initial.teams.length > 0) return [...new Set(initial.teams)];
        const current = String(currentTeam?.id || '').trim();
        return current ? [current] : [];
    });
    const [fieldValues, setFieldValues] = useState(() => initial.fieldValues);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');

    const toggleTeam = (teamId) => {
        setTeams((prev) => (
            prev.includes(teamId)
                ? prev.filter((item) => item !== teamId)
                : [...prev, teamId]
        ));
    };

    const submit = async () => {
        const safeName = String(name || '').trim();
        const safeUrl = String(url || '').trim();
        if (!Array.isArray(teams) || teams.length <= 0) {
            setFormError('Choose at least one team that can view this object.');
            return;
        }

        const nextErrors = {};
        const values = {};

        for (const field of customFields) {
            const rawValue = fieldValues[field.key];
            try {
                values[field.key] = parseFieldValue(field, rawValue);
            } catch (error) {
                nextErrors[field.key] = error?.message || `Invalid value for ${field.key}`;
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            setFormError('Fill every collection field before saving.');
            return;
        }

        setFieldErrors({});
        setFormError('');
        await onSubmit({
            name: safeName,
            url: safeUrl,
            teams,
            values,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content object-hub-modal" onClick={(event) => event.stopPropagation()}>
                <div className="object-hub-modal__header">
                    <div>
                        <p className="object-hub-modal__eyebrow">{typeDef?.displayName || 'Object'}</p>
                        <h2 className="object-hub-modal__title">{mode === 'edit' ? 'Edit Object' : 'Add Object'}</h2>
                    </div>
                    <button className="btn-icon" onClick={onClose}>x</button>
                </div>

                <div className="object-hub-modal__body object-hub-modal__body--scroll">
                    {hasNameField && (
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Object name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                            />
                        </div>
                    )}

                    {hasUrlField && (
                        <div className="form-group">
                            <label className="form-label">URL</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="https://..."
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Visible Teams</label>
                        <div className="object-hub-team-picker">
                            {visibleTeamOptions.map((teamId) => {
                                const selected = teams.includes(teamId);
                                return (
                                    <button
                                        key={teamId}
                                        type="button"
                                        className={`object-hub-team-chip ${selected ? 'is-selected' : ''}`}
                                        onClick={() => toggleTeam(teamId)}
                                    >
                                        {teamId}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="object-hub-field-grid">
                        {customFields.map((field) => {
                            const fieldType = String(field?.type || 'string');
                            const fieldKey = String(field?.key || '');
                            const fieldLabel = String(field?.label || fieldKey || 'Field');
                            const fieldError = fieldErrors[fieldKey];
                            const value = fieldValues[fieldKey] ?? '';

                            return (
                                <div key={fieldKey} className="form-group">
                                    <label className="form-label">
                                        {fieldLabel}
                                        <span className="object-hub-field-type">{fieldType}</span>
                                    </label>

                                    {fieldType === 'boolean' ? (
                                        <select
                                            className="select-field"
                                            value={value}
                                            onChange={(event) => setFieldValues((prev) => ({ ...prev, [fieldKey]: event.target.value }))}
                                        >
                                            <option value="">Select...</option>
                                            <option value="true">true</option>
                                            <option value="false">false</option>
                                        </select>
                                    ) : fieldType === 'array' || fieldType === 'dict' ? (
                                        <textarea
                                            className="input-field object-hub-json-input"
                                            placeholder={fieldType === 'array' ? '[...]' : '{...}'}
                                            value={value}
                                            onChange={(event) => setFieldValues((prev) => ({ ...prev, [fieldKey]: event.target.value }))}
                                        />
                                    ) : (
                                        <input
                                            type={fieldType === 'number' ? 'number' : 'text'}
                                            className="input-field"
                                            value={value}
                                            onChange={(event) => setFieldValues((prev) => ({ ...prev, [fieldKey]: event.target.value }))}
                                        />
                                    )}

                                    {fieldError && <div className="object-hub-field-error">{fieldError}</div>}
                                </div>
                            );
                        })}
                    </div>

                    {formError && <div className="object-hub-form-error">{formError}</div>}
                </div>

                <div className="object-hub-modal__footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : mode === 'edit' ? 'Save Object' : 'Create Object'}
                    </button>
                </div>
            </div>
        </div>
    );
}
