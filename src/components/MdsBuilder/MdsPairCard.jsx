import { HiPlus, HiServer, HiX } from 'react-icons/hi';
import { mdsLabels } from '@/utils/mdsBuilderUtils';

export default function MdsPairCard({
    pair,
    form,
    onFieldChange,
    onPortInputChange,
    onPortPairAdd,
    onPortPairRemove,
}) {
    const smallSection = form[pair.smallKey];
    const coreSection = form[pair.coreKey];
    const smallPorts = smallSection?.port_members || [];
    const corePorts = coreSection?.port_members || [];
    const mappedRows = Array.from(
        { length: Math.max(smallPorts.length, corePorts.length) },
        (_, index) => ({
            index,
            smallPort: smallPorts[index] || '',
            corePort: corePorts[index] || '',
        }),
    );

    const handlePairAddOnEnter = (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        onPortPairAdd(pair.id);
    };

    return (
        <section className="glass-card mds-pair-card">
            <div className="mds-pair-card__header">
                <div className="mds-pair-card__title-wrap">
                    <h3>MDS Pair {pair.label}</h3>
                    <p>#1 {mdsLabels[pair.smallKey]} port maps to #1 {mdsLabels[pair.coreKey]} port.</p>
                </div>
                <span className="mds-pair-card__count">{smallPorts.length} mapped</span>
            </div>

            <div className="mds-pair-card__hosts">
                <article className="glass-card mds-card mds-card--small">
                    <div className="mds-card__header">
                        <span className="mds-card__icon"><HiServer size={16} /></span>
                        <h3>{mdsLabels[pair.smallKey]}</h3>
                    </div>

                    <div className="mds-field">
                        <label className="mds-label">IP</label>
                        <input
                            className="input-field"
                            value={smallSection.host}
                            onChange={(event) => onFieldChange(pair.smallKey, 'host', event.target.value)}
                            placeholder="Enter IP"
                        />
                    </div>

                    <div className="mds-field">
                        <label className="mds-label">New Hostname</label>
                        <input
                            className="input-field"
                            value={smallSection.new_hostname}
                            onChange={(event) => onFieldChange(pair.smallKey, 'new_hostname', event.target.value)}
                            placeholder="Enter new hostname"
                        />
                    </div>
                </article>

                <article className="glass-card mds-card mds-card--core">
                    <div className="mds-card__header">
                        <span className="mds-card__icon"><HiServer size={16} /></span>
                        <h3>{mdsLabels[pair.coreKey]}</h3>
                    </div>

                    <div className="mds-field">
                        <label className="mds-label">Host</label>
                        <input
                            className="input-field"
                            value={coreSection.host}
                            onChange={(event) => onFieldChange(pair.coreKey, 'host', event.target.value)}
                            placeholder="Enter host"
                        />
                    </div>
                </article>
            </div>

            <div className="mds-field mds-field--ports">
                <label className="mds-label">Mapped Ports</label>
                <p className="mds-port-prefix-note"><code>fc</code> is added automatically if missing.</p>
                <div className="mds-port-input-row mds-port-input-row--pair">
                    <input
                        className="input-field"
                        value={smallSection.portInput}
                        onChange={(event) => onPortInputChange(pair.smallKey, event.target.value)}
                        onKeyDown={handlePairAddOnEnter}
                        placeholder={`${mdsLabels[pair.smallKey]} port`}
                    />
                    <input
                        className="input-field"
                        value={coreSection.portInput}
                        onChange={(event) => onPortInputChange(pair.coreKey, event.target.value)}
                        onKeyDown={handlePairAddOnEnter}
                        placeholder={`${mdsLabels[pair.coreKey]} port`}
                    />
                    <button
                        type="button"
                        className="btn btn-secondary mds-port-add-btn"
                        onClick={() => onPortPairAdd(pair.id)}
                    >
                        <HiPlus size={16} />
                        Add Pair
                    </button>
                </div>

                <div className="mds-port-pair-list">
                    {mappedRows.length === 0 && (
                        <p className="mds-port-empty">No mapped ports yet.</p>
                    )}

                    {mappedRows.map((row) => (
                        <div
                            key={`${pair.id}-${row.index}`}
                            className={`mds-port-pair-row ${(!row.smallPort || !row.corePort) ? 'mds-port-pair-row--mismatch' : ''}`}
                        >
                            <span className="mds-port-pair-index">#{row.index + 1}</span>
                            <span className="mds-port-chip mds-port-chip--small">{row.smallPort || 'Missing small port'}</span>
                            <span className="mds-port-pair-arrow">-&gt;</span>
                            <span className="mds-port-chip mds-port-chip--core">{row.corePort || 'Missing core port'}</span>
                            <button
                                type="button"
                                className="mds-port-chip__remove"
                                onClick={() => onPortPairRemove(pair.id, row.index)}
                                aria-label={`Remove port pair ${row.index + 1} from pair ${pair.label}`}
                            >
                                <HiX size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
