import { useEffect, useMemo, useRef, useState } from 'react';
import { HiChevronDown, HiOutlineMinusCircle, HiPlus } from 'react-icons/hi';
import { useTeam } from '../../contexts/TeamContext';

const FIELD_TYPE_OPTIONS = ['string', 'number', 'boolean', 'array', 'dict'];
const ALLOWED_FIELD_TYPES = [...FIELD_TYPE_OPTIONS, 'url'];
const DEFAULT_SYSTEM_FIELDS = [
    { label: 'Name', type: 'string' },
    { label: 'URL', type: 'url' },
];

function slugifyKey(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

function resolvedFieldType(field) {
    const safeKey = slugifyKey(field?.label);
    if (safeKey === 'url') return 'url';
    if (safeKey === 'name') return 'string';
    return String(field?.type || 'string').trim().toLowerCase();
}

function buildInitialState(initialType) {
    const displayName = String(initialType?.displayName || '');
    const teams = Array.isArray(initialType?.teams)
        ? initialType.teams.map((team) => String(team || '').trim()).filter(Boolean)
        : [];
    const fields = Array.isArray(initialType?.fields)
        ? initialType.fields
            .filter((field) => !!field?.active)
            .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
            .map((field, index) => ({
                id: `${field?.key || 'field'}-${index}`,
                label: String(field?.label || ''),
                type: String(field?.type || 'string'),
            }))
        : DEFAULT_SYSTEM_FIELDS.map((field, index) => ({
            id: `default-${index}`,
            label: field.label,
            type: field.type,
        }));
    return { displayName, teams, fields };
}

export default function SchemaModal({
    mode = 'create',
    initialType = null,
    saving = false,
    onSubmit,
    onClose,
}) {
    const { currentTeam, userTeams } = useTeam();
    const initial = buildInitialState(initialType);
    const visibleTeamOptions = useMemo(
        () => userTeams.map((team) => String(team?.id || '').trim()).filter(Boolean),
        [userTeams],
    );
    const [displayName, setDisplayName] = useState(() => initial.displayName);
    const [teams, setTeams] = useState(() => {
        if (initial.teams.length > 0) return [...new Set(initial.teams)];
        const current = String(currentTeam?.id || '').trim();
        return current ? [current] : [];
    });
    const [fields, setFields] = useState(() => initial.fields);
    const [error, setError] = useState('');
    const [openTypeMenuFieldId, setOpenTypeMenuFieldId] = useState(null);
    const openTypeMenuRef = useRef(null);
    const title = mode === 'edit' ? 'Edit Type Schema' : 'Create New Type';

    const addField = () => {
        setFields((prev) => ([
            ...prev,
            { id: `new-${Date.now()}-${prev.length}`, label: '', type: 'string' },
        ]));
    };

    const updateField = (fieldId, key, value) => {
        setFields((prev) => prev.map((field) => (field.id === fieldId ? { ...field, [key]: value } : field)));
    };

    const removeField = (fieldId) => {
        setFields((prev) => prev.filter((field) => field.id !== fieldId));
    };

    useEffect(() => {
        if (!openTypeMenuFieldId) return undefined;

        const handleDocumentClick = (event) => {
            if (!openTypeMenuRef.current) return;
            if (!openTypeMenuRef.current.contains(event.target)) {
                setOpenTypeMenuFieldId(null);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, [openTypeMenuFieldId]);

    const toggleTeam = (teamId) => {
        setTeams((prev) => (
            prev.includes(teamId)
                ? prev.filter((item) => item !== teamId)
                : [...prev, teamId]
        ));
    };

    const submit = async () => {
        const safeDisplayName = String(displayName || '').trim();
        if (!safeDisplayName) {
            setError('Display name is required.');
            return;
        }
        if (!Array.isArray(teams) || teams.length <= 0) {
            setError('Choose at least one team that can see this collection.');
            return;
        }

        const normalizedFields = [];
        const keySet = new Set();

        for (const field of fields) {
            const safeLabel = String(field.label || '').trim();
            const safeKey = slugifyKey(safeLabel);
            const safeType = resolvedFieldType(field);

            if (!safeLabel) {
                setError('Each field must have a label.');
                return;
            }
            if (!safeKey) {
                setError(`Field "${safeLabel}" has an invalid key.`);
                return;
            }
            if (!ALLOWED_FIELD_TYPES.includes(safeType)) {
                setError(`Field "${safeLabel}" has an invalid type.`);
                return;
            }
            if (keySet.has(safeKey)) {
                setError(`Duplicate field key: ${safeKey}`);
                return;
            }

            keySet.add(safeKey);
            normalizedFields.push({
                key: safeKey,
                label: safeLabel,
                type: safeType,
            });
        }

        setError('');
        await onSubmit({
            displayName: safeDisplayName,
            teams,
            fields: normalizedFields,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content object-hub-modal" onClick={(event) => event.stopPropagation()}>
                <div className="object-hub-modal__header">
                    <div>
                        <p className="object-hub-modal__eyebrow">Collection Type</p>
                        <h2 className="object-hub-modal__title">{title}</h2>
                    </div>
                    <button className="btn-icon" onClick={onClose}>x</button>
                </div>

                <div className="object-hub-modal__body">
                    <div className="form-group">
                        <label className="form-label">Display Name</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Example: NetApp"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                        />
                    </div>

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

                    <div className="object-hub-schema-editor">
                        <div className="object-hub-schema-editor__header">
                            <div>
                                <h3>Collection Fields</h3>
                                <p className="object-hub-schema-editor__hint">
                                    `Name` and `URL` are added by default. You can keep them or remove them.
                                </p>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={addField}>
                                <HiPlus size={15} />
                                Add Field
                            </button>
                        </div>

                        {fields.length <= 0 ? (
                            <div className="object-hub-schema-editor__empty">
                                No collection fields yet. Add the fields objects should have.
                            </div>
                        ) : (
                            <div className="object-hub-schema-editor__rows">
                                {fields.map((field) => (
                                    <div key={field.id} className="object-hub-schema-row">
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Field Name"
                                            value={field.label}
                                            onChange={(event) => updateField(field.id, 'label', event.target.value)}
                                        />
                                        {resolvedFieldType(field) === 'url' ? (
                                            <div className="select-field object-hub-schema-type-select object-hub-schema-type-select-btn is-disabled">
                                                <span>url</span>
                                            </div>
                                        ) : (
                                        <div
                                            className={`object-hub-schema-type-wrap ${openTypeMenuFieldId === field.id ? 'is-open' : ''}`}
                                            ref={openTypeMenuFieldId === field.id ? openTypeMenuRef : null}
                                        >
                                            <button
                                                type="button"
                                                className="select-field object-hub-schema-type-select object-hub-schema-type-select-btn"
                                                onClick={() => setOpenTypeMenuFieldId((prev) => (prev === field.id ? null : field.id))}
                                            >
                                                <span>{resolvedFieldType(field)}</span>
                                                <HiChevronDown className="object-hub-schema-type-caret" size={16} />
                                            </button>
                                            {openTypeMenuFieldId === field.id ? (
                                                <div className="object-hub-schema-type-menu">
                                                    {FIELD_TYPE_OPTIONS.map((option) => (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            className={`object-hub-schema-type-menu__item ${resolvedFieldType(field) === option ? 'is-selected' : ''}`}
                                                            onClick={() => {
                                                                updateField(field.id, 'type', option);
                                                                setOpenTypeMenuFieldId(null);
                                                            }}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                        )}
                                        <button
                                            type="button"
                                            className="btn-icon object-hub-schema-row__remove"
                                            onClick={() => removeField(field.id)}
                                        >
                                            <HiOutlineMinusCircle size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <div className="object-hub-form-error">{error}</div>}
                </div>

                <div className="object-hub-modal__footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : mode === 'edit' ? 'Save Schema' : 'Create Type'}
                    </button>
                </div>
            </div>
        </div>
    );
}
