import { useEffect, useMemo, useState } from 'react';
import { HiExclamationCircle, HiRefresh, HiShieldCheck } from 'react-icons/hi';
import { proactiveApi } from '@/api';
import ProactiveMachinePopup from '@/components/Proactive/ProactiveMachinePopup';
import { useTeam } from '@/contexts/TeamContext';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import './ProactivePage.css';

const SUPPORTED_TEAMS = new Set(['BLOCK', 'NASA']);
const TYPE_FILTER_ALL = '__all__';

export default function ProactivePage() {
    const { currentTeam } = useTeam();
    const [machines, setMachines] = useState([]);
    const [selectedType, setSelectedType] = useState(TYPE_FILTER_ALL);
    const [running, setRunning] = useState(false);
    const [runError, setRunError] = useState('');
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [lastRunAt, setLastRunAt] = useState(null);
    const elapsedMs = useElapsedTimer(running);

    const teamId = String(currentTeam?.id || '').toUpperCase();
    const canRun = SUPPORTED_TEAMS.has(teamId);

    const typeOptions = useMemo(
        () => [...new Set(machines.map((machine) => String(machine?.type || '').trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b)),
        [machines],
    );

    const filteredMachines = useMemo(() => {
        if (selectedType === TYPE_FILTER_ALL) return machines;
        return machines.filter((machine) => String(machine?.type || '').trim() === selectedType);
    }, [machines, selectedType]);

    useEffect(() => {
        if (selectedType === TYPE_FILTER_ALL) return;
        if (!typeOptions.includes(selectedType)) {
            setSelectedType(TYPE_FILTER_ALL);
        }
    }, [selectedType, typeOptions]);

    const summary = useMemo(() => {
        const okCount = filteredMachines.filter((machine) => machine.isOk).length;
        const errorCount = filteredMachines.length - okCount;
        return {
            total: filteredMachines.length,
            ok: okCount,
            error: errorCount,
        };
    }, [filteredMachines]);

    const handleRunProactive = async () => {
        if (!canRun || running) return;
        setRunError('');
        setSelectedMachine(null);
        setRunning(true);

        try {
            const nextMachines = await proactiveApi.runScan({ teamId });
            setMachines(Array.isArray(nextMachines) ? nextMachines : []);
            setLastRunAt(new Date());
        } catch (error) {
            setRunError(error?.message || 'Failed to run proactive scan.');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Proactive</h1>
                    <p className="page-subtitle">
                        One shared screen for BLOCK and NASA teams with team-specific backend execution.
                    </p>
                </div>
                <div className="page-actions">
                    <span className="badge badge-accent">Team: {currentTeam?.name || 'Unknown'}</span>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleRunProactive}
                        disabled={!canRun || running}
                    >
                        {running ? (
                            <>
                                <HiRefresh size={16} className="animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <HiShieldCheck size={16} />
                                Run Proactive
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="page-content">
                <section className="glass-card proactive-card">
                    {!canRun && (
                        <div className="proactive-warning">
                            <HiExclamationCircle size={18} />
                            Proactive is available only for BLOCK and NASA teams.
                        </div>
                    )}

                    {runError && <div className="proactive-run-error">{runError}</div>}

                    <div className="proactive-summary">
                        <span className="badge badge-info">Machines: {summary.total}</span>
                        <span className="badge badge-success">OK: {summary.ok}</span>
                        <span className="badge badge-error">Errors: {summary.error}</span>
                        <div className="proactive-type-filter">
                            <label htmlFor="proactive-type-filter" className="proactive-type-filter__label">
                                Type
                            </label>
                            <select
                                id="proactive-type-filter"
                                className="select-field select-sm proactive-type-filter__select"
                                value={selectedType}
                                onChange={(event) => setSelectedType(event.target.value)}
                                disabled={!machines.length}
                            >
                                <option value={TYPE_FILTER_ALL}>All</option>
                                {typeOptions.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        {lastRunAt && (
                            <span className="proactive-last-run">
                                Last run: {lastRunAt.toLocaleTimeString()}
                            </span>
                        )}
                    </div>

                    {running ? (
                        <div className="proactive-loading">
                            <div className="proactive-loading__spinner">
                                <HiRefresh size={20} className="animate-spin" />
                            </div>
                            <div className="proactive-loading__copy">
                                <h3>Running proactive checks...</h3>
                                <p>This can take some time. Please wait for all machine results.</p>
                                <span>{(elapsedMs / 1000).toFixed(1)}s elapsed</span>
                            </div>
                        </div>
                    ) : (
                        <div className="proactive-machine-list">
                            {!machines.length ? (
                                <div className="proactive-empty-state">
                                    <div className="proactive-empty-state__icon" aria-hidden="true">
                                        <HiShieldCheck size={24} />
                                    </div>
                                    <h3 className="proactive-empty-state__title">Ready To Run Proactive Scan</h3>
                                    <p className="proactive-empty-state__text">
                                        Collect machine health across NETAPP, VMAX, and other storage types with full nested diagnostics.
                                    </p>
                                    <div className="proactive-empty-state__chips">
                                        <span className="badge badge-info">Machine Types</span>
                                        <span className="badge badge-accent">Nested Checks</span>
                                        <span className="badge badge-warning">Error Drilldown</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-primary proactive-empty-state__run-btn"
                                        onClick={handleRunProactive}
                                        disabled={!canRun || running}
                                    >
                                        <HiShieldCheck size={16} />
                                        Run Proactive
                                    </button>
                                </div>
                            ) : !filteredMachines.length ? (
                                <div className="proactive-empty-state">
                                    <div className="proactive-empty-state__icon" aria-hidden="true">
                                        <HiShieldCheck size={24} />
                                    </div>
                                    <h3 className="proactive-empty-state__title">No Machines For This Type</h3>
                                    <p className="proactive-empty-state__text">
                                        No machines matched the selected type filter. Try selecting another type or choose All.
                                    </p>
                                </div>
                            ) : (
                                filteredMachines.map((machine, index) => {
                                    return (
                                        <button
                                            key={`${machine.name}-${index}`}
                                            type="button"
                                            className={`proactive-machine-row ${machine.isOk ? 'proactive-machine-row--ok' : 'proactive-machine-row--error'}`}
                                            onClick={() => setSelectedMachine(machine)}
                                        >
                                            <div className="proactive-machine-main">
                                                <span
                                                    className={`proactive-status-dot ${machine.isOk ? 'proactive-status-dot--ok' : 'proactive-status-dot--error'}`}
                                                    aria-hidden="true"
                                                />
                                                <div>
                                                    <div className="proactive-machine-name">{machine.name}</div>
                                                    <div className="proactive-machine-meta">
                                                        <span>{machine.type}</span>
                                                        {!!machine.sid && <span>SID: {machine.sid}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="proactive-machine-state">
                                                <span className={`badge ${machine.isOk ? 'badge-success' : 'badge-error'}`}>
                                                    {machine.status}
                                                </span>
                                                <span className={`proactive-machine-link ${machine.isOk ? 'proactive-machine-link--ok' : 'proactive-machine-link--error'}`}>
                                                    Open details
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </section>
            </div>

            {!!selectedMachine && (
                <ProactiveMachinePopup
                    machine={selectedMachine}
                    onClose={() => setSelectedMachine(null)}
                />
            )}
        </div>
    );
}
