import { useEffect, useMemo, useState } from 'react';
import { HiDatabase, HiRefresh, HiSearch, HiServer, HiX } from 'react-icons/hi';
import { mainApi, troubleshooterApi } from '../api';
import { normalizeNetappMachine } from '../utils/netappMachineMeta';
import './TroubleshooterPage.css';

const modeConfig = {
    vc: {
        key: 'vc',
        label: 'vCenter',
        icon: HiServer,
        color: '#2b7fff',
        subtitle: 'Scan environment via one vCenter.',
    },
    netapp: {
        key: 'netapp',
        label: 'NetApp',
        icon: HiSearch,
        color: '#0f9d62',
        subtitle: 'Scan environment via one NetApp machine.',
    },
    naas: {
        key: 'naas',
        label: 'NAAs',
        icon: HiDatabase,
        color: '#d2871f',
        subtitle: 'Scan environment via NAA list.',
    },
};

function parseNaasInput(rawValue) {
    return [...new Set(
        String(rawValue || '')
            .split(/[,\n\s]+/g)
            .map((item) => item.trim())
            .filter(Boolean),
    )];
}

function formatJsonOutput(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function ResultPopup({ title, result, color, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ts-result-modal animate-scale" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{title}</h2>
                        <p className="page-subtitle">Troubleshooter response JSON</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="ts-result-modal__body" style={{ borderColor: color }}>
                    <pre>{result}</pre>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" style={{ background: color }} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModeLoadingPanel({ mode, elapsedMs = 0 }) {
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

export default function TroubleshooterPage() {
    const [activeModeKey, setActiveModeKey] = useState('vc');
    const [vcOptions, setVcOptions] = useState([]);
    const [netappOptions, setNetappOptions] = useState([]);
    const [vcSearch, setVcSearch] = useState('');
    const [netappSearch, setNetappSearch] = useState('');
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [optionsError, setOptionsError] = useState('');

    const [values, setValues] = useState({
        vc_name: '',
        netapp_name: '',
        naas_raw: '',
    });

    const [running, setRunning] = useState(false);
    const [runStartedAt, setRunStartedAt] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [runError, setRunError] = useState('');
    const [resultModal, setResultModal] = useState(null);

    const activeMode = modeConfig[activeModeKey];
    const ActiveIcon = activeMode.icon;
    const parsedNaas = useMemo(() => parseNaasInput(values.naas_raw), [values.naas_raw]);
    const naasCount = parsedNaas.length;
    const filteredVcOptions = useMemo(
        () => vcOptions.filter((name) => name.toLowerCase().includes(vcSearch.trim().toLowerCase())),
        [vcOptions, vcSearch],
    );
    const filteredNetappOptions = useMemo(
        () => netappOptions.filter((name) => name.toLowerCase().includes(netappSearch.trim().toLowerCase())),
        [netappOptions, netappSearch],
    );

    useEffect(() => {
        if (!running || !runStartedAt) return undefined;

        const timerId = window.setInterval(() => {
            setElapsedMs(Date.now() - runStartedAt);
        }, 120);

        return () => window.clearInterval(timerId);
    }, [running, runStartedAt]);

    useEffect(() => {
        let cancelled = false;

        const loadOptions = async () => {
            setLoadingOptions(true);
            setOptionsError('');
            try {
                const [vcenters, netapps] = await Promise.all([
                    mainApi.getVCenters(),
                    mainApi.getNetappMachines(),
                ]);
                if (cancelled) return;

                const vcList = Array.isArray(vcenters)
                    ? vcenters.map((item) => String(item || '').trim()).filter(Boolean)
                    : [];
                const netappList = Array.isArray(netapps)
                    ? netapps.map((item, index) => normalizeNetappMachine(item, index).name).filter(Boolean)
                    : [];

                setVcOptions(vcList);
                setNetappOptions(netappList);
                setValues((prev) => ({
                    ...prev,
                    vc_name: prev.vc_name || vcList[0] || '',
                    netapp_name: prev.netapp_name || netappList[0] || '',
                }));
            } catch (error) {
                if (!cancelled) {
                    setOptionsError(error?.message || 'Failed to load vCenter/NetApp options.');
                }
            } finally {
                if (!cancelled) setLoadingOptions(false);
            }
        };

        loadOptions();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleRun = async () => {
        setRunError('');
        setRunning(true);
        setRunStartedAt(Date.now());
        setElapsedMs(0);
        try {
            let response = null;
            let title = '';

            if (activeModeKey === 'vc') {
                if (!values.vc_name) throw new Error('Please select a vCenter.');
                response = await troubleshooterApi.byVCenter(values.vc_name);
                title = 'vCenter Troubleshooter';
            } else if (activeModeKey === 'netapp') {
                if (!values.netapp_name) throw new Error('Please select a NetApp.');
                response = await troubleshooterApi.byNetapp(values.netapp_name);
                title = 'NetApp Troubleshooter';
            } else {
                const naas = parseNaasInput(values.naas_raw);
                if (!naas.length) throw new Error('Please enter at least one NAA.');
                response = await troubleshooterApi.byNaas(naas);
                title = 'NAA Troubleshooter';
            }

            setResultModal({
                title,
                color: activeMode.color,
                result: formatJsonOutput(response),
            });
        } catch (error) {
            setRunError(error?.message || 'Troubleshooter run failed.');
        } finally {
            setRunning(false);
            setRunStartedAt(0);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Troubleshooter</h1>
                    <p className="page-subtitle">Focused diagnostics console for environment investigations.</p>
                </div>
            </div>

            <div className="page-content">
                {optionsError && <div className="ts-options-error">{optionsError}</div>}

                <div className="ts-console">
                    <section className="glass-card ts-hero" style={{ '--ts-accent': activeMode.color }}>
                        <div className="ts-hero__intro">
                            <h2>Choose a Troubleshooter flow</h2>
                            <p>Run one focused diagnostic route at a time and inspect the JSON result in popup.</p>
                        </div>
                        <div className="ts-mode-tabs">
                            {Object.values(modeConfig).map((mode) => {
                                const ModeIcon = mode.icon;
                                const isActive = activeModeKey === mode.key;
                                return (
                                    <button
                                        key={mode.key}
                                        type="button"
                                        className={`ts-mode-tab ${isActive ? 'ts-mode-tab--active' : ''}`}
                                        style={isActive ? { borderColor: mode.color, color: mode.color } : {}}
                                        disabled={running}
                                        onClick={() => {
                                            setActiveModeKey(mode.key);
                                            setRunError('');
                                        }}
                                    >
                                        <span className="ts-mode-tab__dot" style={{ background: mode.color }} />
                                        <ModeIcon size={16} />
                                        {mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section
                        className="glass-card ts-workspace"
                        style={{ '--ts-accent': activeMode.color }}
                    >
                        <div className="ts-workspace__decor" aria-hidden="true" />
                        <div className="ts-workspace__header">
                            <div className="ts-workspace__title-wrap">
                                <span className="ts-workspace__icon">
                                    <ActiveIcon size={20} />
                                </span>
                                <div>
                                    <h2>{activeMode.label} Diagnostics</h2>
                                    <p>{activeMode.subtitle}</p>
                                </div>
                            </div>
                        </div>

                        <div className="ts-workspace__body">
                            {running ? (
                                <ModeLoadingPanel mode={activeMode} elapsedMs={elapsedMs} />
                            ) : (
                                <>
                                    {activeModeKey === 'vc' && (
                                        <div className="ts-field ts-input-block">
                                            <label className="ts-label">Choose vCenter</label>
                                            <div className="ts-choice-toolbar">
                                                <input
                                                    type="text"
                                                    className="input-field ts-choice-search"
                                                    value={vcSearch}
                                                    onChange={(event) => setVcSearch(event.target.value)}
                                                    placeholder="Search vCenter..."
                                                    disabled={loadingOptions || !vcOptions.length}
                                                />
                                                <span className="ts-choice-count">
                                                    {filteredVcOptions.length}/{vcOptions.length}
                                                </span>
                                            </div>
                                            {vcOptions.length ? (
                                                filteredVcOptions.length ? (
                                                    <div className="ts-choice-scroll">
                                                        <div className="ts-choice-grid">
                                                            {filteredVcOptions.map((vcName) => {
                                                                const selected = values.vc_name === vcName;
                                                                return (
                                                                    <button
                                                                        key={vcName}
                                                                        type="button"
                                                                        className={`ts-choice-card ${selected ? 'ts-choice-card--active' : ''}`}
                                                                        onClick={() => setValues((prev) => ({ ...prev, vc_name: vcName }))}
                                                                    >
                                                                        <span className="ts-choice-card__title">{vcName}</span>
                                                                        <span className="ts-choice-card__meta">Target vCenter</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="ts-empty-state">No vCenter matches your search.</div>
                                                )
                                            ) : (
                                                <div className="ts-empty-state">No vCenter options available.</div>
                                            )}
                                        </div>
                                    )}

                                    {activeModeKey === 'netapp' && (
                                        <div className="ts-field ts-input-block">
                                            <label className="ts-label">Choose NetApp</label>
                                            <div className="ts-choice-toolbar">
                                                <input
                                                    type="text"
                                                    className="input-field ts-choice-search"
                                                    value={netappSearch}
                                                    onChange={(event) => setNetappSearch(event.target.value)}
                                                    placeholder="Search NetApp..."
                                                    disabled={loadingOptions || !netappOptions.length}
                                                />
                                                <span className="ts-choice-count">
                                                    {filteredNetappOptions.length}/{netappOptions.length}
                                                </span>
                                            </div>
                                            {netappOptions.length ? (
                                                filteredNetappOptions.length ? (
                                                    <div className="ts-choice-scroll">
                                                        <div className="ts-choice-grid">
                                                            {filteredNetappOptions.map((netappName) => {
                                                                const selected = values.netapp_name === netappName;
                                                                return (
                                                                    <button
                                                                        key={netappName}
                                                                        type="button"
                                                                        className={`ts-choice-card ${selected ? 'ts-choice-card--active' : ''}`}
                                                                        onClick={() => setValues((prev) => ({ ...prev, netapp_name: netappName }))}
                                                                    >
                                                                        <span className="ts-choice-card__title">{netappName}</span>
                                                                        <span className="ts-choice-card__meta">Target NetApp</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="ts-empty-state">No NetApp matches your search.</div>
                                                )
                                            ) : (
                                                <div className="ts-empty-state">No NetApp options available.</div>
                                            )}
                                        </div>
                                    )}

                                    {activeModeKey === 'naas' && (
                                        <div className="ts-field ts-input-block">
                                            <label className="ts-label">NAA List ({naasCount})</label>
                                            <textarea
                                                className="input-field ts-naas-input"
                                                rows={6}
                                                value={values.naas_raw}
                                                onChange={(event) => setValues((prev) => ({ ...prev, naas_raw: event.target.value }))}
                                                placeholder="Paste NAAs separated by comma, space, or new line"
                                            />
                                            {!!naasCount && (
                                                <div className="ts-naas-preview">
                                                    {parsedNaas.slice(0, 12).map((naa) => (
                                                        <span key={naa} className="ts-naas-chip">{naa}</span>
                                                    ))}
                                                    {naasCount > 12 && (
                                                        <span className="ts-naas-chip ts-naas-chip--more">+{naasCount - 12} more</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {runError && <div className="ts-run-error">{runError}</div>}
                        </div>

                        <div className="ts-workspace__footer">
                            <button
                                type="button"
                                className="btn btn-primary ts-run-btn"
                                onClick={handleRun}
                                disabled={running || loadingOptions}
                                style={{ background: activeMode.color }}
                            >
                                {running ? (
                                    <>
                                        <HiRefresh size={16} className="animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <HiSearch size={16} />
                                        Run Diagnostics
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {resultModal && (
                <ResultPopup
                    title={resultModal.title}
                    result={resultModal.result}
                    color={resultModal.color}
                    onClose={() => setResultModal(null)}
                />
            )}
        </div>
    );
}
