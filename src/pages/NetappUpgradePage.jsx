import { useMemo, useRef, useState } from 'react';
import { HiCheckCircle, HiLightningBolt, HiServer } from 'react-icons/hi';
import UpgradeCommandList from '../components/Netapp/UpgradeCommandList';
import TerminalPanel from '../components/Netapp/TerminalPanel';
import { usePersistentNetappSocket } from '../hooks/usePersistentNetappSocket';
import { useNetappMachines } from '../hooks/useNetappMachines';
import { createTerminalLine } from '../utils/netappTerminal';
import './NetappOperations.css';

const UPGRADE_COMMAND_DICT = {
    precheck_versions: 'system node image show',
    validate_health: 'cluster show -fields health,eligibility',
    download_package: 'system node image update -package-url http://repo/ontap_9_14_1.tgz',
    install_package: 'system node image update -install true',
    start_upgrade: 'cluster image update -version 9.14.1',
    postcheck_status: 'cluster image show-update-progress',
};

function buildInitialCommands() {
    return Object.values(UPGRADE_COMMAND_DICT).map((command, index) => ({
        id: `upgrade-${index + 1}`,
        command,
        status: 'idle',
    }));
}

function createNewCommand(index) {
    return {
        id: `upgrade-user-${Date.now()}-${index}`,
        command: '',
        status: 'idle',
    };
}

export default function NetappUpgradePage() {
    const [commands, setCommands] = useState(() => buildInitialCommands());
    const [activeCommandId, setActiveCommandId] = useState(() => buildInitialCommands()[0]?.id || '');
    const [terminalLines, setTerminalLines] = useState([]);
    const [credentials, setCredentials] = useState({
        username: 'admin',
        password: '',
        machine: '',
    });
    const [sessionInfo, setSessionInfo] = useState({
        connected: false,
        machine: '',
    });

    const advanceAfterCommandRef = useRef('');
    const pendingCommandIdRef = useRef('');

    const appendTerminalLine = (text, tone = 'default') => {
        setTerminalLines((prev) => [...prev, createTerminalLine(text, tone)]);
    };

    const machines = useNetappMachines((errorMessage) => appendTerminalLine(errorMessage, 'error'));
    const selectedMachine = credentials.machine || machines[0]?.name || '';

    const activeCommand = useMemo(
        () => commands.find((command) => command.id === activeCommandId) || null,
        [commands, activeCommandId],
    );

    const activeCommandIndex = useMemo(
        () => commands.findIndex((command) => command.id === activeCommandId),
        [commands, activeCommandId],
    );

    const moveToNextCommand = () => {
        if (!commands.length) return;
        if (activeCommandIndex < 0) {
            setActiveCommandId(commands[0].id);
            return;
        }
        const nextIndex = activeCommandIndex + 1;
        if (nextIndex < commands.length) {
            setActiveCommandId(commands[nextIndex].id);
        }
    };

    const onSocketMessage = (payload) => {
        try {
            const type = payload?.type;
            if (type === 'hello') {
                appendTerminalLine(`[ws] ${payload.message || 'Connection established.'}`, 'info');
                return;
            }

            if (type === 'auth_ok' || type === 'session') {
                setSessionInfo({
                    connected: !!payload.connected,
                    machine: payload.machine || '',
                });
                appendTerminalLine(`[session] ${payload.message || 'Session updated.'}`, payload.connected ? 'success' : 'warning');
                return;
            }

            if (type === 'response') {
                appendTerminalLine(payload.output || payload.message || '', 'default');

                if (pendingCommandIdRef.current) {
                    const completedId = pendingCommandIdRef.current;
                    setCommands((prev) =>
                        prev.map((command) =>
                            command.id === completedId ? { ...command, status: 'done' } : command,
                        ),
                    );
                    pendingCommandIdRef.current = '';
                }
                if (advanceAfterCommandRef.current) {
                    advanceAfterCommandRef.current = '';
                    moveToNextCommand();
                }
                return;
            }

            // Backward compatibility with old websocket message shape.
            if (type === 'command_output') {
                appendTerminalLine(payload.line || '', 'default');
                return;
            }
            if (type === 'command_done') {
                setCommands((prev) =>
                    prev.map((command) =>
                        command.id === payload.commandId
                            ? { ...command, status: payload.exitCode === 0 ? 'done' : 'error' }
                            : command,
                    ),
                );
                appendTerminalLine(
                    `[${payload.machine}] Completed with exit code ${payload.exitCode}.`,
                    payload.exitCode === 0 ? 'success' : 'error',
                );

                if (advanceAfterCommandRef.current === payload.commandId) {
                    advanceAfterCommandRef.current = '';
                    moveToNextCommand();
                }
                pendingCommandIdRef.current = '';
                return;
            }

            if (type === 'error') {
                appendTerminalLine(`[error] ${payload.message || 'Unexpected backend error.'}`, 'error');
            }
        } catch (error) {
            appendTerminalLine(`[error] ${error?.message || 'Failed to process websocket payload.'}`, 'error');
        }
    };

    const {
        connectionState,
        isConnected,
        connectSession: socketConnectSession,
        sendCommand,
    } = usePersistentNetappSocket(onSocketMessage);

    const updateCommand = (commandId, value) => {
        setCommands((prev) =>
            prev.map((command) =>
                command.id === commandId ? { ...command, command: value, status: 'idle' } : command,
            ),
        );
    };

    const removeCommand = (commandId) => {
        const nextCommands = commands.filter((command) => command.id !== commandId);
        setCommands(nextCommands);
        if (activeCommandId === commandId) {
            setActiveCommandId(nextCommands[0]?.id || '');
        }
    };

    const addCommand = () => {
        const nextCommands = [...commands, createNewCommand(commands.length)];
        setCommands(nextCommands);
        if (!activeCommandId) {
            setActiveCommandId(nextCommands[0]?.id || '');
        }
    };

    const connectSession = () => {
        if (!selectedMachine) {
            appendTerminalLine('Please choose a NetApp machine before connecting.', 'warning');
            return;
        }
        const sent = socketConnectSession({
            machine: selectedMachine,
            username: credentials.username,
            password: credentials.password,
        });
        if (!sent) {
            appendTerminalLine('Websocket is not connected. Waiting for reconnect...', 'warning');
        }
    };

    const runNextCommand = () => {
        if (!activeCommand) {
            appendTerminalLine('No command selected.', 'warning');
            return;
        }
        if (!activeCommand.command.trim()) {
            appendTerminalLine('Active command is empty.', 'warning');
            return;
        }
        if (!selectedMachine) {
            appendTerminalLine('Choose a NetApp machine before running commands.', 'warning');
            return;
        }
        if (!sessionInfo.connected) {
            appendTerminalLine('Connect session first with username and password.', 'warning');
            return;
        }

        const sent = sendCommand(activeCommand.command, selectedMachine);

        if (!sent) {
            appendTerminalLine('Websocket is not connected. Waiting for reconnect...', 'warning');
            return;
        }

        pendingCommandIdRef.current = activeCommand.id;
        setCommands((prev) =>
            prev.map((command) =>
                command.id === activeCommand.id ? { ...command, status: 'running' } : command,
            ),
        );
        advanceAfterCommandRef.current = activeCommand.id;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">NetApp Upgrade</h1>
                    <p className="page-subtitle">Run upgrade commands sequentially on a persistent websocket session.</p>
                </div>
                <div className="page-actions">
                    <span className={`badge ${isConnected ? 'badge-success' : 'badge-warning'}`}>WS {connectionState}</span>
                    <span className={`badge ${sessionInfo.connected ? 'badge-success' : 'badge-accent'}`}>
                        Session {sessionInfo.connected ? 'connected' : 'idle'}
                    </span>
                </div>
            </div>

            <div className="page-content netapp-ops-content">
                <div className="netapp-ops-grid">
                    <UpgradeCommandList
                        commands={commands}
                        activeCommandId={activeCommandId}
                        onSelectCommand={setActiveCommandId}
                        onUpdateCommand={updateCommand}
                        onRemoveCommand={removeCommand}
                        onAddCommand={addCommand}
                    />

                    <TerminalPanel
                        title="Terminal Output"
                        lines={terminalLines}
                        onClear={() => setTerminalLines([])}
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
                                    value={credentials.username}
                                    onChange={(event) =>
                                        setCredentials((prev) => ({ ...prev, username: event.target.value }))
                                    }
                                    placeholder="admin"
                                />
                            </label>
                            <label>
                                <span>Password</span>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={credentials.password}
                                    onChange={(event) =>
                                        setCredentials((prev) => ({ ...prev, password: event.target.value }))
                                    }
                                    placeholder="Password"
                                />
                            </label>
                            <label>
                                <span>NetApp Machine</span>
                                <select
                                    className="select-field"
                                    value={selectedMachine}
                                    onChange={(event) =>
                                        setCredentials((prev) => ({ ...prev, machine: event.target.value }))
                                    }
                                >
                                    {machines.map((machine) => (
                                        <option key={machine.id} value={machine.name}>
                                            {machine.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="netapp-button-grid">
                            <button type="button" className="btn btn-primary" onClick={connectSession}>
                                <HiCheckCircle size={16} />
                                Connect
                            </button>
                            <button type="button" className="btn btn-primary" onClick={runNextCommand}>
                                <HiLightningBolt size={15} />
                                Run Next Command
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={moveToNextCommand}>
                                Select Next
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
