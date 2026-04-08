import {
    formatLabel,
    formatPrimitive,
    isPlainObject,
} from '@/utils/csiWalletsUtils';

export function InlineValue({ value, fieldKey = '' }) {
    if (typeof value === 'boolean') {
        return <span className={`csi-wallets__value-badge ${value ? 'is-true' : 'is-false'}`}>{formatPrimitive(value)}</span>;
    }

    if (String(fieldKey || '').trim().toLowerCase() === 'status') {
        const tone = String(value || '').trim().toLowerCase();
        return <span className={`csi-wallets__value-badge is-${tone || 'neutral'}`}>{formatPrimitive(value)}</span>;
    }

    return <span className="csi-wallets__value-text">{formatPrimitive(value)}</span>;
}

export default function CsiResultView({ value }) {
    if (Array.isArray(value)) {
        if (!value.length) return <div className="csi-wallets__note">No entries returned.</div>;
        const primitivesOnly = value.every((entry) => !Array.isArray(entry) && !isPlainObject(entry));

        if (primitivesOnly) {
            return (
                <ul className="csi-wallets__simple-list">
                    {value.map((entry, index) => (
                        <li key={`${String(entry)}-${index}`} className="csi-wallets__simple-list-item">
                            <InlineValue value={entry} />
                        </li>
                    ))}
                </ul>
            );
        }

        return (
            <div className="csi-wallets__result-group">
                {value.map((entry, index) => (
                    <section key={`item-${index}`} className="csi-wallets__result-section">
                        <div className="csi-wallets__result-section-head">
                            <h4>Item {index + 1}</h4>
                        </div>
                        <CsiResultView value={entry} />
                    </section>
                ))}
            </div>
        );
    }

    if (!isPlainObject(value)) {
        return (
            <div className="csi-wallets__detail-list">
                <div className="csi-wallets__detail-row">
                    <span className="csi-wallets__detail-key">Value</span>
                    <div className="csi-wallets__detail-value">
                        <InlineValue value={value} />
                    </div>
                </div>
            </div>
        );
    }

    const entries = Object.entries(value);
    if (!entries.length) return <div className="csi-wallets__note">No keys returned.</div>;

    const primitiveEntries = entries.filter(([, item]) => !Array.isArray(item) && !isPlainObject(item));
    const nestedEntries = entries.filter(([, item]) => Array.isArray(item) || isPlainObject(item));

    return (
        <div className="csi-wallets__result-group">
            {!!primitiveEntries.length && (
                <div className="csi-wallets__detail-list">
                    {primitiveEntries.map(([key, item]) => (
                        <div key={key} className="csi-wallets__detail-row">
                            <span className="csi-wallets__detail-key">{formatLabel(key)}</span>
                            <div className="csi-wallets__detail-value">
                                <InlineValue value={item} fieldKey={key} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!!nestedEntries.length && nestedEntries.map(([key, item]) => (
                <section key={key} className="csi-wallets__result-section">
                    <div className="csi-wallets__result-section-head">
                        <h4>{formatLabel(key)}</h4>
                    </div>
                    <CsiResultView value={item} />
                </section>
            ))}
        </div>
    );
}
