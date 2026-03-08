import { useEffect, useMemo, useRef, useState } from 'react';
import { HiCheck, HiOutlineLink, HiPencilAlt, HiTrash, HiEye } from 'react-icons/hi';

const COLLECTION_CARD_THEMES = [
    { accent: '#29a36a', accentAlt: '#168f72' },
    { accent: '#2f7df4', accentAlt: '#1e5fd8' },
    { accent: '#0ea5a4', accentAlt: '#0f766e' },
    { accent: '#d97706', accentAlt: '#ea580c' },
    { accent: '#d9467a', accentAlt: '#db2777' },
    { accent: '#84a114', accentAlt: '#4d7c0f' },
    { accent: '#0891b2', accentAlt: '#2563eb' },
    { accent: '#c26a2d', accentAlt: '#b45309' },
    { accent: '#16a34a', accentAlt: '#15803d' },
    { accent: '#2563eb', accentAlt: '#1d4ed8' },
    { accent: '#7c3aed', accentAlt: '#6d28d9' },
    { accent: '#be123c', accentAlt: '#e11d48' },
    { accent: '#0f766e', accentAlt: '#14b8a6' },
    { accent: '#475569', accentAlt: '#334155' },
    { accent: '#ea580c', accentAlt: '#c2410c' },
    { accent: '#3b82f6', accentAlt: '#06b6d4' },
];

function matchesSearch(objectItem, search) {
    const term = String(search || '').trim().toLowerCase();
    if (!term) return true;

    const serializedValues = JSON.stringify(objectItem?.values || {}).toLowerCase();
    const target = `${String(objectItem?.name || '').toLowerCase()} ${String(objectItem?.url || '').toLowerCase()} ${serializedValues}`;
    return target.includes(term);
}

function hashThemeSeed(value) {
    const input = String(value || '').trim().toLowerCase();
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
        hash = ((hash << 5) - hash) + input.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

function resolveCollectionTheme(seed) {
    if (COLLECTION_CARD_THEMES.length <= 0) {
        return { accent: '#2f7df4', accentAlt: '#1e5fd8' };
    }
    const hash = hashThemeSeed(seed);
    return COLLECTION_CARD_THEMES[hash % COLLECTION_CARD_THEMES.length];
}

export default function ObjectCardGrid({
    objects,
    loading = false,
    search = '',
    previewFieldKeys = [],
    previewFieldOptions = [],
    colorTheme = null,
    themeSeed = '',
    onSearchChange,
    onPreviewFieldChange = () => { },
    onExportList = () => { },
    exportDisabled = false,
    onOpenObject,
    onViewObject,
    onEditObject,
    onDeleteObject,
}) {
    const filtered = Array.isArray(objects) ? objects.filter((objectItem) => matchesSearch(objectItem, search)) : [];
    const canViewObject = typeof onViewObject === 'function';
    const canEditObject = typeof onEditObject === 'function';
    const canDeleteObject = typeof onDeleteObject === 'function';
    const pickerRef = useRef(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const selectedPreviewFieldKeys = useMemo(() => {
        const availableKeys = new Set((previewFieldOptions || []).map((field) => String(field?.key || '').trim()));
        const rawKeys = Array.isArray(previewFieldKeys) ? previewFieldKeys : [];
        const seen = new Set();
        return rawKeys
            .map((key) => String(key || '').trim())
            .filter((key) => key && availableKeys.has(key))
            .filter((key) => {
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [previewFieldKeys, previewFieldOptions]);

    const selectedPreviewFields = useMemo(() => {
        const fieldByKey = new Map((previewFieldOptions || []).map((field) => [String(field?.key || ''), field]));
        return selectedPreviewFieldKeys
            .map((key) => fieldByKey.get(key))
            .filter(Boolean);
    }, [previewFieldOptions, selectedPreviewFieldKeys]);
    const collectionTheme = useMemo(
        () => {
            const accent = String(colorTheme?.accent || '').trim();
            const accentAlt = String(colorTheme?.accentAlt || '').trim();
            if (accent && accentAlt) {
                return { accent, accentAlt };
            }
            return resolveCollectionTheme(themeSeed);
        },
        [colorTheme, themeSeed],
    );
    const themedPanelStyle = useMemo(() => ({
        '--object-accent': collectionTheme.accent,
        '--object-accent-alt': collectionTheme.accentAlt,
    }), [collectionTheme]);
    const selectedFieldCount = selectedPreviewFields.length;
    const cardMinHeight = 88 + (selectedFieldCount * 18);
    const gridGap = 16 + (selectedFieldCount * 2);

    const formatPreviewValue = (value) => {
        if (value == null || value === '') return 'null';
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    useEffect(() => {
        if (!isPickerOpen) return undefined;

        const handleDocumentClick = (event) => {
            if (!pickerRef.current) return;
            if (!pickerRef.current.contains(event.target)) {
                setIsPickerOpen(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, [isPickerOpen]);

    const toggleField = (fieldKey) => {
        const key = String(fieldKey || '').trim();
        if (!key) return;

        const nextSelection = selectedPreviewFieldKeys.includes(key)
            ? selectedPreviewFieldKeys.filter((existingKey) => existingKey !== key)
            : [...selectedPreviewFieldKeys, key];
        onPreviewFieldChange(nextSelection);
    };

    const clearFields = () => {
        onPreviewFieldChange([]);
    };
    const selectAllFields = () => {
        const allKeys = (previewFieldOptions || [])
            .map((field) => String(field?.key || '').trim())
            .filter(Boolean);
        onPreviewFieldChange(allKeys);
    };

    return (
        <section className="object-hub-grid-panel object-hub-grid-panel--themed glass-card" style={themedPanelStyle}>
            <div className="object-hub-grid-panel__header">
                <div>
                    <p className="object-hub-grid-panel__eyebrow">Objects</p>
                    <h3 className="object-hub-grid-panel__title">{filtered.length} visible</h3>
                </div>
                <div className="object-hub-grid-panel__filters">
                    <input
                        type="text"
                        className="input-field object-hub-grid-panel__search"
                        placeholder="Search objects..."
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                    />
                    {previewFieldOptions.length > 0 ? (
                        <div ref={pickerRef} className={`object-hub-field-picker ${isPickerOpen ? 'is-open' : ''}`}>
                            <button
                                type="button"
                                className="btn btn-secondary object-hub-field-picker__trigger"
                                onClick={() => setIsPickerOpen((open) => !open)}
                            >
                                {selectedPreviewFields.length > 0 ? `${selectedPreviewFields.length} fields` : 'Choose fields'}
                            </button>
                            {isPickerOpen ? (
                                <div className="object-hub-field-picker__menu">
                                    <div className="object-hub-field-picker__menu-header">
                                        <span>Show in boxes</span>
                                        <div className="object-hub-field-picker__actions">
                                            <button
                                                type="button"
                                                className="object-hub-field-picker__action-btn"
                                                onClick={selectAllFields}
                                                disabled={
                                                    previewFieldOptions.length <= 0
                                                    || selectedPreviewFieldKeys.length >= previewFieldOptions.length
                                                }
                                            >
                                                Select all
                                            </button>
                                            <button
                                                type="button"
                                                className="object-hub-field-picker__action-btn object-hub-field-picker__action-btn--clear"
                                                title="Clear selected fields"
                                                onClick={clearFields}
                                                disabled={selectedPreviewFields.length <= 0}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div className="object-hub-field-picker__options">
                                        {previewFieldOptions.map((field) => {
                                            const key = String(field?.key || '');
                                            const label = String(field?.label || key);
                                            const selected = selectedPreviewFieldKeys.includes(key);
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className={`object-hub-field-picker__option ${selected ? 'is-selected' : ''}`}
                                                    onClick={() => toggleField(key)}
                                                >
                                                    <span className="object-hub-field-picker__option-label">{label}</span>
                                                    {selected ? <HiCheck size={14} /> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn-secondary object-hub-grid-panel__export-btn"
                        onClick={onExportList}
                        disabled={exportDisabled}
                    >
                        Export List
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="object-hub-grid-panel__loading">Loading objects...</div>
            ) : filtered.length <= 0 ? (
                <div className="object-hub-grid-panel__empty">
                    No objects yet. Add your first object to this type.
                </div>
            ) : (
                <div
                    className="object-hub-card-grid"
                    style={{
                        '--object-card-min-height': `${cardMinHeight}px`,
                        '--object-grid-gap': `${gridGap}px`,
                    }}
                >
                    {filtered.map((objectItem) => (
                        <article key={objectItem.id} className="object-hub-card">
                            {(canViewObject || canEditObject || canDeleteObject) && (
                                <div className="object-hub-card__hover-actions">
                                    {canViewObject && (
                                        <button
                                            type="button"
                                            className="object-hub-card__action-btn"
                                            title="View"
                                            aria-label="View object"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onViewObject(objectItem);
                                            }}
                                        >
                                            <HiEye size={14} />
                                        </button>
                                    )}
                                    {canEditObject && (
                                        <button
                                            type="button"
                                            className="object-hub-card__action-btn"
                                            title="Edit"
                                            aria-label="Edit object"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onEditObject?.(objectItem);
                                            }}
                                        >
                                            <HiPencilAlt size={14} />
                                        </button>
                                    )}
                                    {canDeleteObject && (
                                        <button
                                            type="button"
                                            className="object-hub-card__action-btn object-hub-card__action-btn--danger"
                                            title="Delete"
                                            aria-label="Delete object"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onDeleteObject?.(objectItem);
                                            }}
                                        >
                                            <HiTrash size={14} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                className="object-hub-card__main-hit"
                                onClick={() => onOpenObject(objectItem)}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    if (canViewObject) {
                                        onViewObject(objectItem);
                                    }
                                }}
                            >
                                <div className="object-hub-card__header">
                                    <h4 className="object-hub-card__title">{objectItem.name}</h4>
                                </div>

                                <div className="object-hub-card__url">
                                    <HiOutlineLink size={14} />
                                    {objectItem.url ? objectItem.url : 'No URL'}
                                </div>

                                {selectedPreviewFields.length > 0 ? (
                                    <div className="object-hub-card__preview-lines">
                                        {selectedPreviewFields.map((field) => (
                                            <div key={field.key} className="object-hub-card__preview-line">
                                                <span className="object-hub-card__preview-key">{field.label}:</span>
                                                <span className="object-hub-card__preview-value">
                                                    {formatPreviewValue(objectItem?.values?.[field.key])}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
