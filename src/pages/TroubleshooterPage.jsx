import { useState } from 'react';
import { HiDatabase, HiSearch, HiServer, HiX } from 'react-icons/hi';
import ActionModal from '../components/ActionModal/ActionModal';
import { troubleshooterApi } from '../api';
import './Dashboard/ActionScreen.css';
import './TroubleshooterPage.css';

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

function ResultPopup({ title, result, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ts-result-modal animate-scale" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{title}</h2>
                        <p className="page-subtitle">Troubleshooter response</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="ts-result-modal__body">
                    <pre>{result}</pre>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

const troubleshooterFlows = {
    vc: {
        label: 'Troubleshoot vCenter',
        description: 'Run diagnostics using one vCenter name.',
        icon: HiServer,
        params: [
            {
                name: 'vc_name',
                label: 'vCenter',
                type: 'dropdown-api',
                sourceApi: 'main',
                source: '/vc_collector/get_vcs',
                required: true,
            },
        ],
        run: async (values) => troubleshooterApi.byVCenter(values.vc_name),
    },
    netapp: {
        label: 'Troubleshoot NetApp',
        description: 'Run diagnostics using one NetApp name.',
        icon: HiSearch,
        params: [
            {
                name: 'netapp_name',
                label: 'NetApp',
                type: 'dropdown-api',
                sourceApi: 'main',
                source: '/netapps',
                required: true,
            },
        ],
        run: async (values) => troubleshooterApi.byNetapp(values.netapp_name),
    },
    naas: {
        label: 'Troubleshoot NAAs',
        description: 'Run diagnostics using a list of NAA values.',
        icon: HiDatabase,
        params: [
            {
                name: 'naas_raw',
                label: 'NAAs (comma/space/new line)',
                type: 'text',
                required: true,
            },
        ],
        run: async (values) => {
            const naas = parseNaasInput(values.naas_raw);
            if (!naas.length) throw new Error('Please enter at least one NAA.');
            return troubleshooterApi.byNaas(naas);
        },
    },
};

export default function TroubleshooterPage() {
    const [activeFlowKey, setActiveFlowKey] = useState(null);
    const [resultModal, setResultModal] = useState(null);

    const handleRunFlow = async (values) => {
        const flow = troubleshooterFlows[activeFlowKey];
        if (!flow) return;

        const response = await flow.run(values);
        setResultModal({
            title: flow.label,
            result: formatJsonOutput(response),
        });
        setActiveFlowKey(null);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Troubleshooter</h1>
                    <p className="page-subtitle">Choose the diagnostics flow you want to run.</p>
                </div>
            </div>

            <div className="page-content">
                <div className="action-intro glass-card">
                    <h3>Troubleshooter Workspace</h3>
                    <p>Select one flow, enter its parameters, then run to view JSON response in a popup.</p>
                </div>

                <div className="action-grid ts-action-grid">
                    {Object.entries(troubleshooterFlows).map(([flowKey, flow]) => {
                        const Icon = flow.icon;
                        return (
                            <button
                                key={flowKey}
                                className="action-card glass-card"
                                onClick={() => setActiveFlowKey(flowKey)}
                            >
                                <div className="action-icon-wrapper ts-action-icon">
                                    <Icon size={28} />
                                </div>
                                <div className="action-info">
                                    <h3 className="action-title">{flow.label}</h3>
                                    <p className="action-desc">{flow.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeFlowKey && troubleshooterFlows[activeFlowKey] && (
                <ActionModal
                    action={troubleshooterFlows[activeFlowKey]}
                    onClose={() => setActiveFlowKey(null)}
                    onSubmit={handleRunFlow}
                />
            )}

            {resultModal && (
                <ResultPopup
                    title={resultModal.title}
                    result={resultModal.result}
                    onClose={() => setResultModal(null)}
                />
            )}
        </div>
    );
}
