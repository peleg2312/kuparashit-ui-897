import { HiRefresh } from 'react-icons/hi';

export default function TroubleshooterLoadingPanel({ mode, elapsedMs = 0 }) {
    const seconds = (elapsedMs / 1000).toFixed(1);
    return (
        <div className="ts-loading-panel" style={{ '--ts-accent': mode.color }}>
            <div className="ts-loading-panel__scanner" aria-hidden="true">
                <span className="ts-loading-panel__ring ts-loading-panel__ring--outer" />
                <span className="ts-loading-panel__ring ts-loading-panel__ring--inner" />
                <span className="ts-loading-panel__core">
                    <HiRefresh size={16} className="animate-spin" />
                </span>
            </div>
            <div className="ts-loading-panel__copy">
                <h3>Running {mode.label} diagnostics</h3>
                <p>Analyzing environment signals and collecting findings...</p>
                <span>{seconds}s elapsed</span>
            </div>
        </div>
    );
}
