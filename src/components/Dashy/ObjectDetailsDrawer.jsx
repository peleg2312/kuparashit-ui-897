function formatValue(value) {
    if (value == null || value === '') return <span className="object-hub-empty-value">null</span>;
    if (typeof value === 'object') {
        return (
            <pre className="object-hub-json-preview">
                {JSON.stringify(value, null, 2)}
            </pre>
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

    const activeFields = Array.isArray(typeDef?.fields)
        ? typeDef.fields
            .filter((field) => !!field?.active)
            .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
        : [];

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

                <div className="object-hub-details-modal__actions">
                    <button className="btn btn-secondary" onClick={() => onEdit(objectData)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => onDelete(objectData)}>Delete</button>
                </div>

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
                                {formatValue(objectData?.values?.[field.key])}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
