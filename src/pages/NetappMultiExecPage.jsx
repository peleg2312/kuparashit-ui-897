import { useMemo, useState } from 'react';
import { HiLightningBolt, HiServer } from 'react-icons/hi';
import { mainApi } from '../api';
import MachineMultiSelectDropdown from '../components/Netapp/MachineMultiSelectDropdown';
import TerminalPanel from '../components/Netapp/TerminalPanel';
import { useNetappMachines } from '../hooks/useNetappMachines';
import { createTerminalLine } from '../utils/netappTerminal';
import './NetappOperations.css';

const DEFAULT_CREDENTIALS = {
    username: 'admin',
    password: '',
};

const DEFAULT_COMMAND = 'version';

function normalizeHostOutput(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    return JSON.stringify(value, null, 2);
}

export default function NetappMultiExecPage() {
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [focusedMachine, setFocusedMachine] = useState('');
    const [machineLogs, setMachineLogs] = useState({});
    const [systemLogs, setSystemLogs] = useState([]);
    const [credentials, setCredentials] = useState(DEFAULT_CREDENTIALS);
    const [command, setCommand] = useState(DEFAULT_COMMAND);
    const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
    const [machineSearch, setMachineSearch] = useState('');
    const [running, setRunning] = useState(false);

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

    const runMultiExec = async () => {
        if (!validateExecutionInput()) return;

        setRunning(true);
        appendSystemLine(`Running command on ${selectedMachines.length} machine(s)...`, 'info');

        try {
            const response = await mainApi.runMultiCommand({
                user: credentials.username,
                password: credentials.password,
                command,
                hosts: selectedMachines,
            });

            if (!response || typeof response !== 'object') {
                appendSystemLine('No output returned from backend.', 'warning');
                return;
            }

            Object.entries(response).forEach(([host, output]) => {
                appendMachineLine(host, normalizeHostOutput(output), 'default');
                appendMachineLine(host, 'Completed.', 'success');
            });

            appendSystemLine('Multi command completed.', 'success');
        } catch (error) {
            appendSystemLine(`[error] ${error?.message || 'Multi command failed.'}`, 'error');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">NetApp Multi Exec</h1>
                    <p className="page-subtitle">Execute one command on multiple NetApp machines with per-machine output.</p>
                </div>
                <div className="page-actions">
                    <span className={`badge ${running ? 'badge-warning' : 'badge-success'}`}>{running ? 'Running' : 'Idle'}</span>
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
                            <button type="button" className="btn btn-primary" onClick={runMultiExec} disabled={running}>
                                <HiLightningBolt size={15} />
                                {running ? 'Running...' : 'Run Command'}
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
