import { useMemo, useState } from 'react';
import { HiCheckCircle, HiPlus, HiRefresh, HiServer, HiX } from 'react-icons/hi';
import { mainApi } from '../api';
import './MdsBuilderPage.css';

const mdsLabels = {
    small_mds_a: 'Small MDS A',
    small_mds_b: 'Small MDS B',
    core_mds_a: 'Core MDS A',
    core_mds_b: 'Core MDS B',
};

function createInitialFormState() {
    return {
        small_mds_a: { host: '', new_hostname: '', portInput: '', port_members: [] },
        small_mds_b: { host: '', new_hostname: '', portInput: '', port_members: [] },
        core_mds_a: { host: '', portInput: '', port_members: [] },
        core_mds_b: { host: '', portInput: '', port_members: [] },
    };
}

function normalizePort(value) {
    return String(value || '').trim();
}

function buildPayload(form) {
    return {
        mdss: {
            small_mds_a: {
                host: String(form.small_mds_a.host || '').trim(),
                new_hostname: String(form.small_mds_a.new_hostname || '').trim(),
                port_members: [...(form.small_mds_a.port_members || [])],
            },
            small_mds_b: {
                host: String(form.small_mds_b.host || '').trim(),
                new_hostname: String(form.small_mds_b.new_hostname || '').trim(),
                port_members: [...(form.small_mds_b.port_members || [])],
            },
            core_mds_a: {
                host: String(form.core_mds_a.host || '').trim(),
                port_members: [...(form.core_mds_a.port_members || [])],
            },
            core_mds_b: {
                host: String(form.core_mds_b.host || '').trim(),
                port_members: [...(form.core_mds_b.port_members || [])],
            },
        },
    };
}

function formatResponse(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function validateForm(form) {
    const errors = [];
    Object.entries(form).forEach(([mdsKey, section]) => {
        if (!String(section.host || '').trim()) {
            errors.push(`${mdsLabels[mdsKey]}: host is required.`);
        }
        if (mdsKey.startsWith('small_') && !String(section.new_hostname || '').trim()) {
            errors.push(`${mdsLabels[mdsKey]}: new hostname is required.`);
        }
        if (!Array.isArray(section.port_members) || section.port_members.length === 0) {
            errors.push(`${mdsLabels[mdsKey]}: add at least one port.`);
        }
    });
    return errors;
}

function MdsSectionCard({
    mdsKey,
    section,
    onFieldChange,
    onPortChange,
    onPortAdd,
    onPortRemove,
}) {
    const isSmall = mdsKey.startsWith('small_');
    return (
        <section className={`glass-card mds-card ${isSmall ? 'mds-card--small' : 'mds-card--core'}`}>
            <div className="mds-card__header">
                <span className="mds-card__icon"><HiServer size={16} /></span>
                <h3>{mdsLabels[mdsKey]}</h3>
            </div>

            <div className="mds-field">
                <label className="mds-label">Host</label>
                <input
                    className="input-field"
                    value={section.host}
                    onChange={(event) => onFieldChange(mdsKey, 'host', event.target.value)}
                    placeholder="Enter host"
                />
            </div>

            {isSmall && (
                <div className="mds-field">
                    <label className="mds-label">New Hostname</label>
                    <input
                        className="input-field"
                        value={section.new_hostname}
                        onChange={(event) => onFieldChange(mdsKey, 'new_hostname', event.target.value)}
                        placeholder="Enter new hostname"
                    />
                </div>
            )}

            <div className="mds-field mds-field--ports">
                <label className="mds-label">Ports</label>
                <div className="mds-port-input-row">
                    <input
                        className="input-field"
                        value={section.portInput}
                        onChange={(event) => onPortChange(mdsKey, event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onPortAdd(mdsKey);
                            }
                        }}
                        placeholder="Type a port and press Enter"
                    />
                    <button
                        type="button"
                        className="btn btn-secondary mds-port-add-btn"
                        onClick={() => onPortAdd(mdsKey)}
                    >
                        <HiPlus size={16} />
                        Add
                    </button>
                </div>
                <div className="mds-port-list">
                    {(section.port_members || []).map((port) => (
                        <span key={`${mdsKey}-${port}`} className="mds-port-chip">
                            {port}
                            <button
                                type="button"
                                className="mds-port-chip__remove"
                                onClick={() => onPortRemove(mdsKey, port)}
                                aria-label={`Remove ${port}`}
                            >
                                <HiX size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default function MdsBuilderPage() {
    const [form, setForm] = useState(createInitialFormState);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState('summary');
    const [responsePayload, setResponsePayload] = useState(null);

    const summaryPayload = useMemo(() => buildPayload(form), [form]);

    const updateField = (mdsKey, field, value) => {
        setForm((prev) => ({
            ...prev,
            [mdsKey]: {
                ...prev[mdsKey],
                [field]: value,
            },
        }));
    };

    const updatePortInput = (mdsKey, value) => {
        setForm((prev) => ({
            ...prev,
            [mdsKey]: {
                ...prev[mdsKey],
                portInput: value,
            },
        }));
    };

    const addPort = (mdsKey) => {
        const port = normalizePort(form[mdsKey]?.portInput);
        if (!port) return;

        setForm((prev) => {
            const current = prev[mdsKey];
            if ((current.port_members || []).includes(port)) {
                return {
                    ...prev,
                    [mdsKey]: {
                        ...current,
                        portInput: '',
                    },
                };
            }
            return {
                ...prev,
                [mdsKey]: {
                    ...current,
                    portInput: '',
                    port_members: [...(current.port_members || []), port],
                },
            };
        });
    };

    const removePort = (mdsKey, portToRemove) => {
        setForm((prev) => ({
            ...prev,
            [mdsKey]: {
                ...prev[mdsKey],
                port_members: (prev[mdsKey].port_members || []).filter((port) => port !== portToRemove),
            },
        }));
    };

    const openSummary = () => {
        const issues = validateForm(form);
        if (issues.length) {
            setError(issues[0]);
            return;
        }

        setError('');
        setResponsePayload(null);
        setModalStep('summary');
        setModalOpen(true);
    };

    const executeBuild = async () => {
        setError('');
        setModalStep('loading');
        try {
            const response = await mainApi.executeSmallMdsBuilder(summaryPayload);
            setResponsePayload(response);
            setModalStep('result');
        } catch (requestError) {
            setModalOpen(false);
            setModalStep('summary');
            setError(requestError?.message || 'Failed to execute MDS builder request.');
        }
    };

    const closeModal = () => {
        if (modalStep === 'loading') return;
        setModalOpen(false);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">MDS Builder</h1>
                    <p className="page-subtitle">Build small/core MDS host and port configuration, then execute once.</p>
                </div>
                <div className="page-actions mds-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setForm(createInitialFormState())}>
                        Reset
                    </button>
                    <button type="button" className="btn btn-primary" onClick={openSummary}>
                        Execute
                    </button>
                </div>
            </div>

            <div className="page-content mds-page-content">
                <div className="mds-page">
                    {error && <div className="mds-error">{error}</div>}

                    <div className="mds-grid">
                        {Object.entries(form).map(([mdsKey, section]) => (
                            <MdsSectionCard
                                key={mdsKey}
                                mdsKey={mdsKey}
                                section={section}
                                onFieldChange={updateField}
                                onPortChange={updatePortInput}
                                onPortAdd={addPort}
                                onPortRemove={removePort}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content mds-modal" onClick={(event) => event.stopPropagation()}>
                        {modalStep === 'summary' && (
                            <>
                                <div className="modal-header">
                                    <h2 className="modal-title">Configuration Summary</h2>
                                    <button type="button" className="btn-icon" onClick={closeModal}>
                                        <HiX size={16} />
                                    </button>
                                </div>
                                <div className="mds-modal__body">
                                    <pre>{formatResponse(summaryPayload)}</pre>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={executeBuild}>Execute</button>
                                </div>
                            </>
                        )}

                        {modalStep === 'loading' && (
                            <div className="mds-loading">
                                <span className="mds-loading__spinner"><HiRefresh size={22} className="animate-spin" /></span>
                                <h3>Executing MDS Builder</h3>
                                <p>Sending configuration and waiting for backend response...</p>
                            </div>
                        )}

                        {modalStep === 'result' && (
                            <>
                                <div className="modal-header">
                                    <h2 className="modal-title">Execution Result</h2>
                                    <button type="button" className="btn-icon" onClick={closeModal}>
                                        <HiX size={16} />
                                    </button>
                                </div>
                                <div className="mds-result-banner">
                                    <HiCheckCircle size={18} />
                                    Request completed successfully.
                                </div>
                                <div className="mds-modal__body">
                                    <pre>{formatResponse(responsePayload)}</pre>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary" onClick={closeModal}>Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
