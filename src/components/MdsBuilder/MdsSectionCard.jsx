import { HiPlus, HiServer, HiX } from 'react-icons/hi';
import { mdsLabels } from '@/utils/mdsBuilderUtils';

export default function MdsSectionCard({
    mdsKey,
    section,
    onFieldChange,
    onPortChange,
    onPortAdd,
    onPortRemove,
}) {
    const isSmall = mdsKey.startsWith('small_');

    return (
        <section className={`glass-card mds-card ${isSmall ? 'mds-card--small' : 'mds-card--core'}`}>
            <div className="mds-card__header">
                <span className="mds-card__icon"><HiServer size={16} /></span>
                <h3>{mdsLabels[mdsKey]}</h3>
            </div>

            <div className="mds-field">
                <label className="mds-label">Host</label>
                <input
                    className="input-field"
                    value={section.host}
                    onChange={(event) => onFieldChange(mdsKey, 'host', event.target.value)}
                    placeholder="Enter host"
                />
            </div>

            {isSmall && (
                <div className="mds-field">
                    <label className="mds-label">New Hostname</label>
                    <input
                        className="input-field"
                        value={section.new_hostname}
                        onChange={(event) => onFieldChange(mdsKey, 'new_hostname', event.target.value)}
                        placeholder="Enter new hostname"
                    />
                </div>
            )}

            <div className="mds-field mds-field--ports">
                <label className="mds-label">Ports</label>
                <div className="mds-port-input-row">
                    <input
                        className="input-field"
                        value={section.portInput}
                        onChange={(event) => onPortChange(mdsKey, event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onPortAdd(mdsKey);
                            }
                        }}
                        placeholder="Type a port and press Enter"
                    />
                    <button
                        type="button"
                        className="btn btn-secondary mds-port-add-btn"
                        onClick={() => onPortAdd(mdsKey)}
                    >
                        <HiPlus size={16} />
                        Add
                    </button>
                </div>
                <div className="mds-port-list">
                    {(section.port_members || []).map((port) => (
                        <span key={`${mdsKey}-${port}`} className="mds-port-chip">
                            {port}
                            <button
                                type="button"
                                className="mds-port-chip__remove"
                                onClick={() => onPortRemove(mdsKey, port)}
                                aria-label={`Remove ${port}`}
                            >
                                <HiX size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
