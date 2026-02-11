import { useState } from 'react';
import ActionModal from '../../components/ActionModal/ActionModal';
import JobTracker from '../../components/JobTracker/JobTracker';
import { getActionsForScreen } from '../../config/actions';
import { exchApi, kprApi, mainApi } from '../../api';
import { HiPlus, HiTrash, HiViewGrid, HiServer, HiDatabase, HiCube } from 'react-icons/hi';
import './ActionScreen.css';

const iconMap = {
    create: HiPlus,
    delete: HiTrash,
    createCluster: HiViewGrid,
    extend: HiCube,
    // Add defaults
    default: HiServer
};

const colorMap = {
    create: 'var(--accent)',
    delete: 'var(--error)',
    createCluster: 'var(--info)',
    extend: 'var(--warning)',
    default: 'var(--text-secondary)'
};

export default function ActionScreen({ screenId, title, subtitle, apiService }) {
    const [activeAction, setActiveAction] = useState(null);
    const [job, setJob] = useState(null);

    const apiByName = {
        main: mainApi,
        kpr: kprApi,
        exch: exchApi,
    };
    const actions = getActionsForScreen(screenId);

    const handleActionSubmit = async (values) => {
        const action = actions[activeAction];
        const api = apiByName[action.api] || apiService || kprApi;
        const result = await api.executeAction(action.endpoint, values);
        setActiveAction(null);
        setJob(result);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{title}</h1>
                    <p className="page-subtitle">{subtitle}</p>
                </div>
            </div>

            <div className="page-content">
                <div className="action-intro glass-card">
                    <h3>Operations Workspace</h3>
                    <p>Select one action to open its parameters popup. Each action sends a request and returns a tracked job execution.</p>
                </div>

                <div className="action-grid">
                    {Object.entries(actions).map(([key, action]) => {
                        const Icon = iconMap[key] || iconMap.default;
                        const color = colorMap[key] || colorMap.default;

                        return (
                            <button
                                key={key}
                                className="action-card glass-card"
                                onClick={() => setActiveAction(key)}
                            >
                                <div className="action-icon-wrapper" style={{ color: color, background: `color-mix(in srgb, ${color}, transparent 90%)` }}>
                                    <Icon size={32} />
                                </div>
                                <div className="action-info">
                                    <h3 className="action-title">{action.label}</h3>
                                    <p className="action-desc">{action.params.length} parameters</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Action Modal */}
            {activeAction && actions[activeAction] && (
                <ActionModal
                    action={actions[activeAction]}
                    onClose={() => setActiveAction(null)}
                    onSubmit={handleActionSubmit}
                />
            )}

            {/* Job Execution Tracker */}
            {job && (
                <JobTracker job={job} onClose={() => setJob(null)} />
            )}
        </div>
    );
}
