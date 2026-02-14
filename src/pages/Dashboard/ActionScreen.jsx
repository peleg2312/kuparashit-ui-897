import { useState } from 'react';
import ActionModal from '../../components/ActionModal/ActionModal';
import JobTracker from '../../components/JobTracker/JobTracker';
import { getActionsForScreen } from '../../config/actions';
import { actionCardColorMap, actionIconMap, resolveActionApi, resolveActionEndpoint } from '../../utils/actionHandlers';
import './ActionScreen.css';

export default function ActionScreen({ screenId, title, subtitle, apiService }) {
    const [activeAction, setActiveAction] = useState(null);
    const [job, setJob] = useState(null);

    const actions = getActionsForScreen(screenId);

    const handleActionSubmit = async (values) => {
        const action = actions[activeAction];
        const endpoint = resolveActionEndpoint(action, values);
        const api = resolveActionApi(action, apiService);
        const result = await api.executeAction(endpoint, values);
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
                        const Icon = actionIconMap[key] || actionIconMap.default;
                        const color = actionCardColorMap[key] || actionCardColorMap.default;

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
