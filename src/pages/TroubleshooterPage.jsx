import { useEffect, useMemo, useState } from 'react';
import { HiRefresh, HiSearch } from 'react-icons/hi';
import { troubleshooterApi } from '@/api';
import TroubleshooterChoiceField from '@/components/Troubleshooter/TroubleshooterChoiceField';
import TroubleshooterLoadingPanel from '@/components/Troubleshooter/TroubleshooterLoadingPanel';
import TroubleshooterResultPopup from '@/components/Troubleshooter/TroubleshooterResultPopup';
import { TROUBLESHOOTER_MODE_CONFIG } from '@/config/troubleshooterModes';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { useTroubleshooterOptions } from '@/hooks/useTroubleshooterOptions';
import { formatJsonOutput, parseNaasInput } from '@/utils/troubleshooterUtils';
import './TroubleshooterPage.css';

function ModeTabs({ activeModeKey, running, onSelectMode }) {
    return (
        <div className="ts-mode-tabs">
            {Object.values(TROUBLESHOOTER_MODE_CONFIG).map((mode) => {
                const ModeIcon = mode.icon;
                const isActive = activeModeKey === mode.key;
                return (
                    <button
                        key={mode.key}
                        type="button"
                        className={`ts-mode-tab ${isActive ? 'ts-mode-tab--active' : ''}`}
                        style={isActive ? { borderColor: mode.color, color: mode.color } : {}}
                        disabled={running}
                        onClick={() => onSelectMode(mode.key)}
                    >
                        <span className="ts-mode-tab__dot" style={{ background: mode.color }} />
                        <ModeIcon size={16} />
                        {mode.label}
                    </button>
                );
            })}
        </div>
    );
}

export default function TroubleshooterPage() {
    const [activeModeKey, setActiveModeKey] = useState('vc');
    const [vcSearch, setVcSearch] = useState('');
    const [netappSearch, setNetappSearch] = useState('');
    const [values, setValues] = useState({
        vc_name: '',
        netapp_name: '',
        naas_raw: '',
    });
    const [running, setRunning] = useState(false);
    const [runError, setRunError] = useState('');
    const [resultModal, setResultModal] = useState(null);

    const activeMode = TROUBLESHOOTER_MODE_CONFIG[activeModeKey];
    const ActiveIcon = activeMode.icon;
    const elapsedMs = useElapsedTimer(running);

    const {
        vcOptions,
        netappOptions,
        loadingOptions,
        optionsError,
    } = useTroubleshooterOptions();

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
        if (!vcOptions.length && !netappOptions.length) return;
        setValues((prev) => ({
            ...prev,
            vc_name: prev.vc_name || vcOptions[0] || '',
            netapp_name: prev.netapp_name || netappOptions[0] || '',
        }));
    }, [netappOptions, vcOptions]);

    const runTroubleshooter = async () => {
        setRunError('');
        setRunning(true);
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
                        <ModeTabs
                            activeModeKey={activeModeKey}
                            running={running}
                            onSelectMode={(modeKey) => {
                                setActiveModeKey(modeKey);
                                setRunError('');
                            }}
                        />
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
                                <TroubleshooterLoadingPanel mode={activeMode} elapsedMs={elapsedMs} />
                            ) : (
                                <>
                                    {activeModeKey === 'vc' && (
                                        <TroubleshooterChoiceField
                                            label="Choose vCenter"
                                            searchValue={vcSearch}
                                            onSearchChange={setVcSearch}
                                            options={vcOptions}
                                            filteredOptions={filteredVcOptions}
                                            selectedValue={values.vc_name}
                                            onSelectOption={(value) => setValues((prev) => ({ ...prev, vc_name: value }))}
                                            loadingOptions={loadingOptions}
                                            searchPlaceholder="Search vCenter..."
                                            emptyAllText="No vCenter options available."
                                            emptyFilteredText="No vCenter matches your search."
                                            optionMetaLabel="Target vCenter"
                                        />
                                    )}

                                    {activeModeKey === 'netapp' && (
                                        <TroubleshooterChoiceField
                                            label="Choose NetApp"
                                            searchValue={netappSearch}
                                            onSearchChange={setNetappSearch}
                                            options={netappOptions}
                                            filteredOptions={filteredNetappOptions}
                                            selectedValue={values.netapp_name}
                                            onSelectOption={(value) => setValues((prev) => ({ ...prev, netapp_name: value }))}
                                            loadingOptions={loadingOptions}
                                            searchPlaceholder="Search NetApp..."
                                            emptyAllText="No NetApp options available."
                                            emptyFilteredText="No NetApp matches your search."
                                            optionMetaLabel="Target NetApp"
                                        />
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
                                onClick={runTroubleshooter}
                                disabled={running || loadingOptions}
                                style={{ background: activeMode.color, '--btn-primary-glow': activeMode.color }}
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
                <TroubleshooterResultPopup
                    title={resultModal.title}
                    result={resultModal.result}
                    color={resultModal.color}
                    onClose={() => setResultModal(null)}
                />
            )}
        </div>
    );
}
