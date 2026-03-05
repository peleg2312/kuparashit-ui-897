import { useEffect, useMemo, useState } from 'react';
import { HiRefresh, HiSearch } from 'react-icons/hi';
import { troubleshooterApi } from '@/api';
import TroubleshooterChoiceField from '@/components/Troubleshooter/TroubleshooterChoiceField';
import TroubleshooterLoadingPanel from '@/components/Troubleshooter/TroubleshooterLoadingPanel';
import TroubleshooterModeTabs from '@/components/Troubleshooter/TroubleshooterModeTabs';
import TroubleshooterNaasInputField from '@/components/Troubleshooter/TroubleshooterNaasInputField';
import TroubleshooterResultPopup from '@/components/Troubleshooter/TroubleshooterResultPopup';
import { TROUBLESHOOTER_MODE_CONFIG } from '@/config/troubleshooterModes';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { useTroubleshooterOptions } from '@/hooks/useTroubleshooterOptions';
import { parseNaasInput } from '@/utils/troubleshooterUtils';
import './TroubleshooterPage.css';

const NAAS_SITE_OPTIONS = [
    { value: 'five', label: 'five' },
    { value: 'nova', label: 'nova' },
];
const NAAS_SITE_VALUES = new Set(NAAS_SITE_OPTIONS.map((site) => site.value));

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function padDateValue(value) {
    return String(value).padStart(2, '0');
}

function getDefaultNaasDateTime() {
    const currentDate = new Date();
    currentDate.setSeconds(0, 0);

    const year = currentDate.getFullYear();
    const month = padDateValue(currentDate.getMonth() + 1);
    const day = padDateValue(currentDate.getDate());
    const hours = padDateValue(currentDate.getHours());
    const minutes = padDateValue(currentDate.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toUtcTimestamp(localDateTime) {
    const rawValue = String(localDateTime || '').trim();
    if (!rawValue) return '';

    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) return '';

    return parsedDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function looksLikeStructuredResultMap(value) {
    if (!isPlainObject(value)) return false;
    const entries = Object.entries(value);
    if (!entries.length) return false;
    return entries.every(([key, entryValue]) => String(key || '').trim() && isPlainObject(entryValue));
}

function normalizeTimedFlowResult(response) {
    const timestampKey = toUtcTimestamp(getDefaultNaasDateTime());
    if (!timestampKey) return response;

    if (looksLikeStructuredResultMap(response)) {
        const entries = Object.entries(response);
        if (entries.length === 1) {
            return { [timestampKey]: entries[0][1] };
        }
        return response;
    }

    if (isPlainObject(response)) {
        const payload = Object.prototype.hasOwnProperty.call(response, 'problems')
            ? response
            : { problems: [], ...response };
        return { [timestampKey]: payload };
    }

    return {
        [timestampKey]: {
            problems: [],
            response: [String(response ?? '')],
        },
    };
}

export default function TroubleshooterPage() {
    const defaultNaasDateTime = useMemo(() => getDefaultNaasDateTime(), []);
    const [activeModeKey, setActiveModeKey] = useState('vc');
    const [vcSearch, setVcSearch] = useState('');
    const [netappSearch, setNetappSearch] = useState('');
    const [values, setValues] = useState({
        vc_name: '',
        netapp_name: '',
        naas_raw: '',
        naas_site: 'five',
        naas_datetime_local: defaultNaasDateTime,
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

    const setNaasToNow = () => {
        const latest = getDefaultNaasDateTime();
        setValues((prev) => ({
            ...prev,
            naas_datetime_local: latest,
        }));
    };

    const runTroubleshooter = async () => {
        setRunError('');
        setRunning(true);
        try {
            let response = null;
            let title = '';

            if (activeModeKey === 'vc') {
                if (!values.vc_name) throw new Error('Please select a vCenter.');
                response = await troubleshooterApi.byVCenter(values.vc_name);
                response = normalizeTimedFlowResult(response);
                title = 'vCenter Troubleshooter';
            } else if (activeModeKey === 'netapp') {
                if (!values.netapp_name) throw new Error('Please select a NetApp.');
                response = await troubleshooterApi.byNetapp(values.netapp_name);
                response = normalizeTimedFlowResult(response);
                title = 'NetApp Troubleshooter';
            } else {
                const naas = parseNaasInput(values.naas_raw);
                if (!naas.length) throw new Error('Please enter at least one NAA.');
                const selectedSite = String(values.naas_site || '').trim().toLowerCase();
                if (!NAAS_SITE_VALUES.has(selectedSite)) {
                    throw new Error('Please choose a valid site.');
                }

                const utcTimestamp = toUtcTimestamp(values.naas_datetime_local);
                if (!utcTimestamp) {
                    throw new Error('Please choose a valid date and time.');
                }

                response = await troubleshooterApi.byNaas(naas, {
                    site: selectedSite,
                    time: utcTimestamp,
                });
                title = 'NAA Troubleshooter';
            }

            setResultModal({
                title,
                color: activeMode.color,
                result: response,
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
                            <p>Run one focused diagnostic route at a time and inspect structured findings in popup.</p>
                        </div>
                        <TroubleshooterModeTabs
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
                                        <TroubleshooterNaasInputField
                                            siteOptions={NAAS_SITE_OPTIONS}
                                            siteValue={values.naas_site}
                                            dateTimeValue={values.naas_datetime_local}
                                            naasRawValue={values.naas_raw}
                                            naasCount={naasCount}
                                            parsedNaas={parsedNaas}
                                            onSiteChange={(value) => setValues((prev) => ({ ...prev, naas_site: value }))}
                                            onDateTimeChange={(value) => setValues((prev) => ({ ...prev, naas_datetime_local: value }))}
                                            onNaasRawChange={(value) => setValues((prev) => ({ ...prev, naas_raw: value }))}
                                            onUseNow={setNaasToNow}
                                        />
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
