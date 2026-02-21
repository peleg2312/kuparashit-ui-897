import { HiCheckCircle, HiLightningBolt, HiServer } from 'react-icons/hi';
import TerminalPanel from '@/components/Netapp/TerminalPanel';
import UpgradeCommandList from '@/components/Netapp/UpgradeCommandList';
import { useNetappUpgradeSession } from '@/hooks/useNetappUpgradeSession';
import './NetappOperations.css';

export default function NetappUpgradePage() {
    const { data, actions } = useNetappUpgradeSession();

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">NetApp Upgrade</h1>
                    <p className="page-subtitle">Run upgrade commands sequentially on a persistent websocket session.</p>
                </div>
                <div className="page-actions">
                    <span className={`badge ${data.isConnected ? 'badge-success' : 'badge-warning'}`}>WS {data.connectionState}</span>
                    <span className={`badge ${data.sessionInfo.connected ? 'badge-success' : 'badge-accent'}`}>
                        Session {data.sessionInfo.connected ? 'connected' : 'idle'}
                    </span>
                </div>
            </div>

            <div className="page-content netapp-ops-content">
                <div className="netapp-ops-grid">
                    <UpgradeCommandList
                        commands={data.commands}
                        activeCommandId={data.activeCommandId}
                        onSelectCommand={actions.setActiveCommandId}
                        onUpdateCommand={actions.updateCommand}
                        onRemoveCommand={actions.removeCommand}
                        onAddCommand={actions.addCommand}
                    />

                    <TerminalPanel
                        title="Terminal Output"
                        lines={data.terminalLines}
                        onClear={actions.clearTerminalLines}
                        emptyMessage="Output from the NetApp websocket session will appear here."
                    />

                    <section className="glass-card netapp-panel netapp-panel--session">
                        <div className="netapp-panel__title-row">
                            <h2>
                                <HiServer size={18} />
                                Session
                            </h2>
                        </div>

                        <div className="netapp-form-grid">
                            <label>
                                <span>Username</span>
                                <input
                                    className="input-field"
                                    value={data.credentials.username}
                                    onChange={(event) => actions.setCredentialField('username', event.target.value)}
                                    placeholder="admin"
                                />
                            </label>
                            <label>
                                <span>Password</span>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={data.credentials.password}
                                    onChange={(event) => actions.setCredentialField('password', event.target.value)}
                                    placeholder="Password"
                                />
                            </label>
                            <label>
                                <span>NetApp Machine</span>
                                <select
                                    className="select-field"
                                    value={data.selectedMachine}
                                    onChange={(event) => actions.setCredentialField('machine', event.target.value)}
                                >
                                    {data.machines.map((machine) => (
                                        <option key={machine.id} value={machine.name}>
                                            {machine.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="netapp-button-grid">
                            <button type="button" className="btn btn-primary" onClick={actions.connectSession}>
                                <HiCheckCircle size={16} />
                                Connect
                            </button>
                            <button type="button" className="btn btn-primary" onClick={actions.runNextCommand}>
                                <HiLightningBolt size={15} />
                                Run Next Command
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={actions.moveToNextCommand}>
                                Select Next
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
