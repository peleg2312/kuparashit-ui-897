import { useMemo, useState } from 'react';
import { HiLightningBolt, HiServer } from 'react-icons/hi';
import MachineMultiSelectDropdown from '../components/Netapp/MachineMultiSelectDropdown';
import TerminalPanel from '../components/Netapp/TerminalPanel';
import { usePersistentNetappSocket } from '../hooks/usePersistentNetappSocket';
import { useNetappMachines } from '../hooks/useNetappMachines';
import { createTerminalLine } from '../utils/netappTerminal';
import './NetappOperations.css';

const DEFAULT_CREDENTIALS = {
    username: 'admin',
    password: '',
};

const DEFAULT_COMMAND = 'version';

export default function NetappMultiExecPage() {
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [focusedMachine, setFocusedMachine] = useState('');
    const [machineLogs, setMachineLogs] = useState({});
    const [systemLogs, setSystemLogs] = useState([]);
    const [credentials, setCredentials] = useState(DEFAULT_CREDENTIALS);
    const [command, setCommand] = useState(DEFAULT_COMMAND);
    const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
    const [machineSearch, setMachineSearch] = useState('');

    const appendSystemLine = (text, tone = 'default') => (
        setSystemLogs((prev) => [...prev, createTerminalLine(text, tone)])
    );

    const appendMachineLine = (machine, text, tone = 'default') => (
        setMachineLogs((prev) => ({
            ...prev,
            [machine]: [...(prev[machine] || []), createTerminalLine(text, tone)],
        }))
    );

    const setCredentialField = (field, value) => {
        setCredentials((prev) => ({ ...prev, [field]: value }));
    };

    const machines = useNetappMachines((errorMessage) => appendSystemLine(errorMessage, 'error'));

    const handleCommandDone = (payload) => {
        appendMachineLine(
            payload.machine,
            `Completed with exit code ${payload.exitCode}.`,
            payload.exitCode === 0 ? 'success' : 'error',
        );
    };

    const handleBatchDone = (payload) => {
        appendSystemLine(
            `Batch ${payload.batchId} finished. Success: ${payload.successCount}, Failed: ${payload.failedCount}.`,
            payload.failedCount ? 'warning' : 'success',
        );
    };

    const onSocketMessage = (payload) => {
        try {
            switch (payload?.type) {
                case 'hello':
                    appendSystemLine(`[ws] ${payload.message || 'Connection established.'}`, 'info');
                    break;
                case 'command_start':
                    appendMachineLine(payload.machine, `Running command: ${payload.command}`, 'info');
                    break;
                case 'command_output':
                    appendMachineLine(payload.machine, payload.line || '', 'default');
                    break;
                case 'command_done':
                    handleCommandDone(payload);
                    break;
                case 'multi_start':
                    appendSystemLine(
                        `Batch ${payload.batchId} started on ${payload.machines.length} machine(s).`,
                        'info',
                    );
                    break;
                case 'multi_done':
                    handleBatchDone(payload);
                    break;
                case 'error':
                    appendSystemLine(`[error] ${payload.message || 'Unexpected backend error.'}`, 'error');
                    break;
                default:
                    break;
            }
        } catch (error) {
            appendSystemLine(`[error] ${error?.message || 'Failed to process websocket payload.'}`, 'error');
        }
    };

    const { connectionState, isConnected, sendMessage } = usePersistentNetappSocket(onSocketMessage);

    const activeMachine = useMemo(() => {
        if (!selectedMachines.length) return '';
        if (focusedMachine && selectedMachines.includes(focusedMachine)) return focusedMachine;
        return selectedMachines[0];
    }, [selectedMachines, focusedMachine]);

    const visibleLogs = useMemo(() => {
        if (!activeMachine) return systemLogs;
        return machineLogs[activeMachine] || [];
    }, [activeMachine, machineLogs, systemLogs]);

    const toggleMachineSelection = (machineName) => {
        setSelectedMachines((prev) => (
            prev.includes(machineName)
                ? prev.filter((name) => name !== machineName)
                : [...prev, machineName]
        ));
    };

    const selectAllMachines = () => {
        setSelectedMachines(machines.map((machine) => machine.name));
    };

    const clearSelectedMachines = () => {
        setSelectedMachines([]);
        setFocusedMachine('');
    };

    const validateExecutionInput = () => {
        if (!command.trim()) {
            appendSystemLine('Command is required.', 'warning');
            return false;
        }
        if (!selectedMachines.length) {
            appendSystemLine('Select at least one machine.', 'warning');
            return false;
        }
        return true;
    };

    const runMultiExec = () => {
        if (!validateExecutionInput()) return;

        const sent = sendMessage({
            type: 'run_multi',
            batchId: `batch-${Date.now()}`,
            command,
            machines: selectedMachines,
            username: credentials.username,
            password: credentials.password,
        });

        if (!sent) {
            appendSystemLine('Websocket is not connected. Waiting for reconnect...', 'warning');
            return;
        }

        const primaryMachine = activeMachine || selectedMachines[0];
        sendMessage({
            type: 'connect',
            machine: primaryMachine,
            username: credentials.username,
            password: credentials.password,
        });
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">NetApp Multi Exec</h1>
                    <p className="page-subtitle">Execute one command on multiple NetApp machines with per-machine output.</p>
                </div>
                <div className="page-actions">
                    <span className={`badge ${isConnected ? 'badge-success' : 'badge-warning'}`}>WS {connectionState}</span>
                    <span className="badge badge-accent">{selectedMachines.length} selected</span>
                </div>
            </div>

            <div className="page-content netapp-ops-content">
                <div className="netapp-multi-grid">
                    <section className="glass-card netapp-panel netapp-panel--session">
                        <div className="netapp-panel__title-row">
                            <h2>
                                <HiServer size={18} />
                                Inputs
                            </h2>
                        </div>

                        <div className="netapp-form-grid">
                            <MachineMultiSelectDropdown
                                machines={machines}
                                selectedMachines={selectedMachines}
                                isOpen={machineDropdownOpen}
                                onOpenChange={setMachineDropdownOpen}
                                searchQuery={machineSearch}
                                onSearchChange={setMachineSearch}
                                onToggleMachine={toggleMachineSelection}
                                onSelectAll={selectAllMachines}
                                onClearSelection={clearSelectedMachines}
                            />

                            <label>
                                <span>Username</span>
                                <input
                                    className="input-field"
                                    value={credentials.username}
                                    onChange={(event) => setCredentialField('username', event.target.value)}
                                    placeholder="admin"
                                />
                            </label>
                            <label>
                                <span>Password</span>
                                <input
                                    className="input-field"
                                    type="password"
                                    value={credentials.password}
                                    onChange={(event) => setCredentialField('password', event.target.value)}
                                    placeholder="Password"
                                />
                            </label>
                            <label>
                                <span>Command</span>
                                <textarea
                                    className="input-field netapp-command-input"
                                    rows={3}
                                    value={command}
                                    onChange={(event) => setCommand(event.target.value)}
                                    placeholder="Enter command to run on selected machines"
                                />
                            </label>
                        </div>

                        <div className="netapp-button-grid">
                            <button type="button" className="btn btn-primary" onClick={runMultiExec}>
                                <HiLightningBolt size={15} />
                                Run Command
                            </button>
                        </div>
                    </section>

                    <TerminalPanel
                        title={activeMachine ? `Terminal - ${activeMachine}` : 'Terminal - System'}
                        lines={visibleLogs}
                        onClear={() => {
                            if (!activeMachine) {
                                setSystemLogs([]);
                                return;
                            }
                            setMachineLogs((prev) => ({
                                ...prev,
                                [activeMachine]: [],
                            }));
                        }}
                        emptyMessage="Select machines and run a command to see output."
                    />

                    <section className="glass-card netapp-panel netapp-panel--machines">
                        <div className="netapp-panel__title-row">
                            <h2>Selected Machines</h2>
                        </div>

                        <div className="netapp-selected-list">
                            {selectedMachines.length === 0 ? (
                                <div className="netapp-empty-state">No machine selected.</div>
                            ) : (
                                selectedMachines.map((machineName) => {
                                    const isFocused = machineName === activeMachine;
                                    return (
                                        <button
                                            type="button"
                                            key={machineName}
                                            className={`netapp-selected-list__item ${isFocused ? 'is-active' : ''}`}
                                            onClick={() => setFocusedMachine(machineName)}
                                        >
                                            <span>{machineName}</span>
                                            <span className="badge badge-accent">{(machineLogs[machineName] || []).length} lines</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
