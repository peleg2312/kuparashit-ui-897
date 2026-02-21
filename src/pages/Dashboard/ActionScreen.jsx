import { useState } from 'react';
import ActionModal from '../../components/ActionModal/ActionModal';
import JobTracker from '../../components/JobTracker/JobTracker';
import { getActionsForScreen } from '../../config/actions';
import { resolveActionApi, resolveActionEndpoint } from '../../utils/actions/actionApi';
import { actionCardColorMap, actionIconMap } from '../../utils/actions/actionPresentation';
import { normalizeActionPayload } from '../../utils/actions/actionPayload';
import './ActionScreen.css';

export default function ActionScreen({ screenId, title, subtitle, apiService }) {
    const [activeAction, setActiveAction] = useState(null);
    const [job, setJob] = useState(null);

    const actions = getActionsForScreen(screenId);
    const shouldHighlightCreate = screenId === 'exch' || screenId === 'qtree';

    const handleActionSubmit = async (values) => {
        const action = actions[activeAction];
        const endpoint = resolveActionEndpoint(action, values);
        const api = resolveActionApi(action, apiService);
        const payload = normalizeActionPayload(action, values);
        const result = await api.executeAction(endpoint, payload, {
            method: action?.method || 'post',
            network: values?.network || '',
            site: values?.site || '',
        });
        if (result?.error) {
            throw new Error(result.error);
        }
        if (!result?.jobId) {
            throw new Error(result?.message || 'Action response is missing jobId');
        }
        setActiveAction(null);
        setJob({
            ...result,
            message: result?.message || '',
            error: result?.error || '',
        });
    };

    return (
        <div className={`page-container action-screen action-screen--${screenId}`}>
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
                        const baseColor = actionCardColorMap[key] || actionCardColorMap.default;
                        const color = shouldHighlightCreate && key === 'create' ? 'var(--success)' : baseColor;

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
                    actionKey={activeAction}
                    screenId={screenId}
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
