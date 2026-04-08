import { HiExclamationCircle } from 'react-icons/hi';
import CsiControlsPanel from '@/components/CsiWallets/CsiControlsPanel';
import CsiResultPanel from '@/components/CsiWallets/CsiResultPanel';
import { useCsiWalletsPageState } from '@/hooks/useCsiWalletsPageState';
import './CsiWalletsPage.css';

export default function CsiWalletsPage() {
    const {
        state,
        actions,
        dropdown,
    } = useCsiWalletsPageState();

    return (
        <div className="page-container csi-wallets-page">
            <div className="page-header csi-wallets__header">
                <div>
                    <h1 className="page-title">CSI Wallets</h1>
                    <p className="page-subtitle">Run Check To Find Data About The Csi</p>
                </div>
            </div>

            <div className="page-content">
                {state.sourceState.error && <div className="csi-wallets__alert csi-wallets__alert--error"><HiExclamationCircle size={18} />{state.sourceState.error}</div>}

                <div className="csi-wallets__workspace">
                    <CsiControlsPanel
                        selectedCheck={state.selectedCheck}
                        checks={state.checks}
                        selectedCheckKey={state.selectedCheckKey}
                        activeCheckKey={state.activeCheckKey}
                        values={state.values}
                        options={state.options}
                        sourceState={state.sourceState}
                        openDropdown={dropdown.openDropdown}
                        setOpenDropdown={dropdown.setOpenDropdown}
                        registerDropdownRef={dropdown.registerDropdownRef}
                        onSelectCheck={actions.selectCheck}
                        onValueChange={actions.updateValue}
                        onRunCheck={actions.runCheck}
                    />

                    <CsiResultPanel
                        checkError={state.checkError}
                        lastResult={state.lastResult}
                        activeCheckKey={state.activeCheckKey}
                    />
                </div>
            </div>
        </div>
    );
}
