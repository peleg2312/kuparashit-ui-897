import { HiPencilAlt, HiPlus, HiTrash } from 'react-icons/hi';

function toSearchValue(type) {
    const displayName = String(type?.displayName || '').toLowerCase();
    const typeKey = String(type?.typeKey || '').toLowerCase();
    return `${displayName} ${typeKey}`;
}

export default function TypeRail({
    types,
    selectedTypeKey,
    loading = false,
    search = '',
    onSearchChange,
    onSelectType,
    onCreateType,
    onEditType,
    onDeleteType,
}) {
    const term = String(search || '').trim().toLowerCase();
    const filteredTypes = !term
        ? types
        : types.filter((type) => toSearchValue(type).includes(term));

    return (
        <aside className="object-hub-type-rail glass-card">
            <div className="object-hub-type-rail__header">
                <div>
                    <p className="object-hub-type-rail__eyebrow">Object Types</p>
                    <h3 className="object-hub-type-rail__title">Collections</h3>
                </div>
                <button className="btn btn-primary object-hub-type-rail__add-btn" onClick={onCreateType}>
                    <HiPlus size={16} />
                    Add Type
                </button>
            </div>

            <div className="object-hub-type-rail__search">
                <input
                    type="text"
                    className="input-field"
                    placeholder="Search type..."
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </div>

            <div className="object-hub-type-rail__list">
                {loading ? (
                    <div className="object-hub-type-rail__loading">Loading types...</div>
                ) : filteredTypes.length <= 0 ? (
                    <div className="object-hub-type-rail__empty">
                        No types found. Create your first collection type.
                    </div>
                ) : (
                    filteredTypes.map((type) => {
                        const typeKey = String(type?.typeKey || '');
                        const isActive = typeKey && typeKey === selectedTypeKey;
                        const isReadOnly = Boolean(type?.readOnly);
                        return (
                            <button
                                key={typeKey}
                                type="button"
                                className={`object-hub-type-item ${isActive ? 'object-hub-type-item--active' : ''}`}
                                onClick={() => onSelectType(type)}
                            >
                                <div className="object-hub-type-item__text">
                                    <span className="object-hub-type-item__name">{type?.displayName || typeKey}</span>
                                    <span className="object-hub-type-item__meta">
                                        {type?.objectCount || 0} objects
                                    </span>
                                </div>

                                {!isReadOnly && (
                                    <div className="object-hub-type-item__actions" onClick={(event) => event.stopPropagation()}>
                                        <button
                                            type="button"
                                            className="btn-icon object-hub-type-item__icon-btn"
                                            title="Edit type schema"
                                            onClick={() => onEditType(type)}
                                        >
                                            <HiPencilAlt size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-icon object-hub-type-item__icon-btn object-hub-type-item__icon-btn--danger"
                                            title="Delete type"
                                            onClick={() => onDeleteType(type)}
                                        >
                                            <HiTrash size={14} />
                                        </button>
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </aside>
    );
}

