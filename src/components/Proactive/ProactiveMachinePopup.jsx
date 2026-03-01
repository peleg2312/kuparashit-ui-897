import { HiX } from 'react-icons/hi';

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitive(value) {
    return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isSidKey(value) {
    return /^\d{8,}$/.test(String(value || '').trim());
}

function isStatusLikeKey(value) {
    return /(status|state|health|result)/i.test(String(value || '').trim());
}

function formatKeyLabel(key) {
    const raw = String(key || '').trim();
    if (!raw) return 'Value';
    if (isSidKey(raw)) return `SID ${raw}`;
    return raw
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClassName(value) {
    const text = String(value || '').toUpperCase();
    if (/(OK|SUCCESS|HEALTHY|PASS|UP|NORMAL)/.test(text)) return 'proactive-status-pill proactive-status-pill--ok';
    if (/(ERROR|FAIL|FAILED|CRITICAL|DOWN|ALERT)/.test(text)) return 'proactive-status-pill proactive-status-pill--error';
    return 'proactive-status-pill proactive-status-pill--neutral';
}

function PrimitiveValue({ value, fieldKey = '' }) {
    if (value == null || value === '') {
        return <span className="proactive-empty-value">-</span>;
    }

    if (typeof value === 'boolean') {
        return <span className={`badge ${value ? 'badge-success' : 'badge-warning'}`}>{value ? 'True' : 'False'}</span>;
    }

    if (isStatusLikeKey(fieldKey)) {
        return <span className={statusClassName(value)}>{String(value)}</span>;
    }

    return <span className="proactive-primitive-value">{String(value)}</span>;
}

function NestedBlock({ value, depth = 0 }) {
    if (isPrimitive(value)) {
        return <PrimitiveValue value={value} />;
    }

    if (Array.isArray(value)) {
        if (!value.length) return <span className="proactive-empty-value">Empty list</span>;

        return (
            <div className="proactive-array-block">
                {value.map((item, index) => (
                    <div key={`arr-${depth}-${index}`} className="proactive-array-item">
                        {isPrimitive(item) ? (
                            <PrimitiveValue value={item} />
                        ) : (
                            <NestedBlock value={item} depth={depth + 1} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (!isPlainObject(value)) {
        return <PrimitiveValue value={String(value)} />;
    }

    const entries = Object.entries(value);
    if (!entries.length) return <span className="proactive-empty-value">Empty object</span>;

    return (
        <div className={`proactive-object-block proactive-object-block--depth-${Math.min(depth, 4)}`}>
            {entries.map(([key, child]) => {
                const nested = !isPrimitive(child);
                const sidCard = isSidKey(key) && nested;

                if (nested) {
                    return (
                        <section
                            key={`${depth}-${key}`}
                            className={`proactive-nested-card ${sidCard ? 'proactive-nested-card--sid' : ''}`}
                        >
                            <header className="proactive-nested-title">
                                <span>{formatKeyLabel(key)}</span>
                                {sidCard && <span className="badge badge-info">VMAX SID</span>}
                            </header>
                            <div className="proactive-nested-content">
                                <NestedBlock value={child} depth={depth + 1} />
                            </div>
                        </section>
                    );
                }

                return (
                    <div key={`${depth}-${key}`} className="proactive-kv-row">
                        <div className="proactive-kv-key">{formatKeyLabel(key)}</div>
                        <div className="proactive-kv-value">
                            <PrimitiveValue value={child} fieldKey={key} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function ProactiveMachinePopup({ machine, onClose }) {
    if (!machine) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content proactive-modal animate-scale" onClick={(event) => event.stopPropagation()}>
                <div className="proactive-modal__header">
                    <div>
                        <h2 className="modal-title">{machine.name}</h2>
                        <p className="page-subtitle">Machine diagnostics details</p>
                    </div>
                    <button className="btn-icon" onClick={onClose} aria-label="Close error details">
                        <HiX size={20} />
                    </button>
                </div>

                <div className="proactive-modal__meta">
                    <span className="badge badge-accent">{machine.type}</span>
                    <span className={`badge ${machine.isOk ? 'badge-success' : 'badge-error'}`}>{machine.status}</span>
                    {!!machine.sid && <span className="badge badge-info">SID: {machine.sid}</span>}
                </div>

                <div className="proactive-modal__body">
                    <div className="proactive-structured">
                        <NestedBlock value={machine.errorPayload} />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
