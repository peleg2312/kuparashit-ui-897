function labelFromKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Field';
    const normalized = raw.replace(/[_-]+/g, ' ');
    return normalized
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ');
}

function renderNestedValue(value, depth = 0) {
    if (value == null || value === '') return <span className="object-hub-empty-value">null</span>;

    if (Array.isArray(value)) {
        if (value.length <= 0) return <span className="object-hub-empty-value">[]</span>;
        return (
            <div className={`object-hub-nested-list depth-${depth}`}>
                {value.map((item, index) => (
                    <div key={`arr-${depth}-${index}`} className="object-hub-nested-item">
                        <span className="object-hub-nested-key">[{index}]</span>
                        <div className="object-hub-nested-value">{renderNestedValue(item, depth + 1)}</div>
                    </div>
                ))}
            </div>
        );
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length <= 0) return <span className="object-hub-empty-value">{'{}'}</span>;
        return (
            <div className={`object-hub-nested-list depth-${depth}`}>
                {entries.map(([key, item]) => (
                    <div key={`obj-${depth}-${key}`} className="object-hub-nested-item">
                        <span className="object-hub-nested-key">{key}</span>
                        <div className="object-hub-nested-value">{renderNestedValue(item, depth + 1)}</div>
                    </div>
                ))}
            </div>
        );
    }

    return <span>{String(value)}</span>;
}

export default function ObjectDetailsDrawer({
    typeDef,
    objectData,
    onClose,
    onEdit,
    onDelete,
}) {
    if (!objectData) return null;

    const activeFieldsFromSchema = Array.isArray(typeDef?.fields)
        ? typeDef.fields
            .filter((field) => !!field?.active)
            .filter((field) => !['name', 'url'].includes(String(field?.key || '').trim().toLowerCase()))
            .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
        : [];
    const activeFields = activeFieldsFromSchema.length > 0
        ? activeFieldsFromSchema
        : Object.keys(objectData?.values && typeof objectData.values === 'object' ? objectData.values : {})
            .sort((a, b) => a.localeCompare(b))
            .map((key, index) => ({
                key,
                label: labelFromKey(key),
                active: true,
                order: index + 1,
            }));

    const canEdit = typeof onEdit === 'function';
    const canDelete = typeof onDelete === 'function';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <section className="modal-content object-hub-details-modal" onClick={(event) => event.stopPropagation()}>
                <div className="object-hub-details-modal__header">
                    <div>
                        <p className="object-hub-details-modal__eyebrow">{typeDef?.displayName || 'Object Type'}</p>
                        <h2 className="object-hub-details-modal__title">{objectData?.name || 'Object Details'}</h2>
                    </div>
                    <button className="btn-icon" onClick={onClose}>x</button>
                </div>

                {(canEdit || canDelete) && (
                    <div className="object-hub-details-modal__actions">
                        {canEdit && <button className="btn btn-secondary" onClick={() => onEdit(objectData)}>Edit</button>}
                        {canDelete && <button className="btn btn-danger" onClick={() => onDelete(objectData)}>Delete</button>}
                    </div>
                )}

                <div className="object-hub-details-modal__body">
                    <div className="object-hub-details-row">
                        <span className="object-hub-details-key">Name</span>
                        <span className="object-hub-details-value">{objectData?.name || '-'}</span>
                    </div>
                    <div className="object-hub-details-row">
                        <span className="object-hub-details-key">URL</span>
                        <span className="object-hub-details-value">
                            {objectData?.url ? objectData.url : <span className="object-hub-empty-value">none</span>}
                        </span>
                    </div>

                    {activeFields.map((field) => (
                        <div key={field.key} className="object-hub-details-row">
                            <span className="object-hub-details-key">{field.label}</span>
                            <span className="object-hub-details-value">
                                {renderNestedValue(objectData?.values?.[field.key])}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
