import { HiWallet } from 'react-icons/hi2';
import CsiChecksSection from '@/components/CsiWallets/CsiChecksSection';
import CsiInputsSection from '@/components/CsiWallets/CsiInputsSection';

export default function CsiControlsPanel(props) {
    const {
        selectedCheck,
        checks,
        selectedCheckKey,
        activeCheckKey,
        onSelectCheck,
    } = props;

    return (
        <aside className="glass-card csi-wallets__panel csi-wallets__panel--controls">
            <div className="csi-wallets__panel-head">
                <div>
                    <span className="csi-wallets__eyebrow">Functions</span>
                    <h2>Choose Check</h2>
                </div>
                <div className="csi-wallets__panel-icon" aria-hidden="true"><HiWallet size={20} /></div>
            </div>

            <CsiInputsSection
                {...props}
                selectedCheck={selectedCheck}
            />

            <CsiChecksSection
                checks={checks}
                selectedCheckKey={selectedCheckKey}
                activeCheckKey={activeCheckKey}
                onSelectCheck={onSelectCheck}
            />
        </aside>
    );
}
