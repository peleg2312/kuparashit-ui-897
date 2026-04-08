import { FIELD_CONFIG } from '@/utils/csiWalletsUtils';

export default function CsiChecksSection({
    checks,
    selectedCheckKey,
    activeCheckKey,
    onSelectCheck,
}) {
    return (
        <section className="csi-wallets__section">
            <div className="csi-wallets__section-head">
                <h3>Checks</h3>
            </div>

            <div className="csi-wallets__function-picker">
                {checks.map((check) => {
                    const Icon = check.icon;
                    const isSelected = check.key === selectedCheckKey;

                    return (
                        <button
                            key={check.key}
                            type="button"
                            className={`csi-wallets__function-card ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => onSelectCheck(check.key)}
                            disabled={!!activeCheckKey}
                        >
                            <span className="csi-wallets__function-icon"><Icon size={18} /></span>
                            <div className="csi-wallets__function-copy">
                                <div className="csi-wallets__function-main">
                                    <div className="csi-wallets__function-title-row">
                                        <strong>{check.label}</strong>
                                    </div>
                                </div>
                                <span className="csi-wallets__function-desc">{check.description}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
