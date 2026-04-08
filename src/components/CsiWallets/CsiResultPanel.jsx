import { HiCheckCircle, HiExclamationCircle, HiRefresh } from 'react-icons/hi';
import CsiResultView, { InlineValue } from '@/components/CsiWallets/CsiResultView';
import {
    formatLabel,
    getPayloadMeta,
} from '@/utils/csiWalletsUtils';

export default function CsiResultPanel({
    checkError,
    lastResult,
    activeCheckKey,
}) {
    const paramEntries = Object.entries(lastResult?.params || {}).filter(([, item]) => String(item || '').trim());

    return (
        <section className="glass-card csi-wallets__panel csi-wallets__panel--result">

            {checkError && <div className="csi-wallets__alert csi-wallets__alert--error"><HiExclamationCircle size={18} />{checkError}</div>}

            {!lastResult && !activeCheckKey && (
                <div className="csi-wallets__empty">
                    <div className="csi-wallets__empty-icon" aria-hidden="true"><HiCheckCircle size={24} /></div>
                    <h3>Run a check</h3>
                    <p>Result appears here.</p>
                </div>
            )}

            {!!lastResult && (
                <div className="csi-wallets__result">
                    <div className="csi-wallets__result-summary">
                        <div>
                            <div className="csi-wallets__result-title">
                                <h3>{lastResult.label}</h3>
                                <span className="csi-wallets__endpoint">{lastResult.endpoint}</span>
                            </div>
                        </div>

                        <div className="csi-wallets__summary-side">
                            <span className={`csi-wallets__value-badge ${activeCheckKey === lastResult.checkKey ? 'is-warning' : 'is-ok'}`}>
                                {activeCheckKey === lastResult.checkKey ? 'Running' : 'Completed'}
                            </span>
                        </div>
                    </div>

                    {activeCheckKey === lastResult.checkKey && (
                        <div className="csi-wallets__loading">
                            <HiRefresh size={20} className="animate-spin" />
                            <div>
                                <h4>Running Check</h4>
                                <p>The response will appear here as soon as the API returns.</p>
                            </div>
                        </div>
                    )}

                    {!activeCheckKey && lastResult.payload != null && (
                        <>
                            <section className="csi-wallets__result-block">
                                <div className="csi-wallets__result-block-head">
                                    <h4>Response</h4>
                                    <span>{getPayloadMeta(lastResult.payload)}</span>
                                </div>
                                <CsiResultView value={lastResult.payload} />
                            </section>
                        </>
                    )}

                    {!activeCheckKey && lastResult.payload == null && !checkError && (
                        <div className="csi-wallets__note">No payload returned for the latest request.</div>
                    )}
                </div>
            )}
        </section>
    );
}
