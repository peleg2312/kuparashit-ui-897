import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import ActionModal from '../../components/ActionModal/ActionModal';
import JobTracker from '../../components/JobTracker/JobTracker';
import { getActionsForScreen } from '../../config/actions';
import { herziApi } from '../../api';
import { HiPlus, HiSearch, HiX } from 'react-icons/hi';
import {
    actionButtonStyleMap,
    actionIconMap,
    buildActionInitialValues,
    resolveActionApi,
    resolveActionEndpoint,
} from '../../utils/actionHandlers';
import { formatHerziResult, herziQueryByScreen } from '../../utils/dashboardScreenHandlers';
import './DashboardScreen.css';

function HerziResultModal({ title, loading, result, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{title}</h2>
                        <p className="page-subtitle">Live Herzi query result</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><HiX size={18} /></button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <p>Querying Herzi...</p>
                    ) : (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.84rem' }}>
                            {result || 'No result'}
                        </pre>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default function DashboardScreen({
    screenId,
    title,
    subtitle,
    columns,
    fetchData,
    apiService,
    readOnly = false,
    allowSelection = true,
}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeAction, setActiveAction] = useState(null);
    const [actionInitialValues, setActionInitialValues] = useState({});
    const [job, setJob] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [herziLoading, setHerziLoading] = useState(false);
    const [herziResult, setHerziResult] = useState('');
    const [showHerziResult, setShowHerziResult] = useState(false);

    const actions = readOnly ? {} : getActionsForScreen(screenId);

    const loadData = useCallback(() => {
        setLoading(true);
        fetchData().then((rows) => {
            setData(rows);
            setLoading(false);
        });
    }, [fetchData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openAction = (key) => {
        const action = actions[key];
        if (!action) return;
        const initialValues = buildActionInitialValues(action, selectedRows);
        setActionInitialValues(initialValues);
        setActiveAction(key);
    };

    const handleActionSubmit = async (values) => {
        const action = actions[activeAction];
        const endpoint = resolveActionEndpoint(action, values);
        const payload = activeAction === 'delete'
            ? { ...values, selectedIds }
            : values;
        const api = resolveActionApi(action, apiService);
        const result = await api.executeAction(endpoint, payload);
        setActiveAction(null);
        setActionInitialValues({});
        setJob(result);
        setSelectedIds([]);
        setSelectedRows([]);
    };

    const handleRowHerziSearch = async (row) => {
        const config = herziQueryByScreen[screenId];
        if (!config) return;

        const input = config.getInput(row);
        if (!input) return;

        setShowHerziResult(true);
        setHerziLoading(true);
        try {
            const result = await herziApi.query(config.endpoint, String(input));
            setHerziResult(formatHerziResult(result));
        } catch (error) {
            setHerziResult(`Query failed: ${error?.message || 'unknown error'}`);
        } finally {
            setHerziLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{title}</h1>
                    <p className="page-subtitle">{subtitle}</p>
                </div>
                {!readOnly && (
                    <div className="page-actions">
                        {Object.entries(actions).map(([key, action]) => {
                            const Icon = actionIconMap[key] || HiPlus;
                            const style = actionButtonStyleMap[key] || 'btn-secondary';
                            const label = key === 'delete' && selectedRows.length > 0
                                ? `${action.label} (${selectedRows.length} preselected)`
                                : action.label;
                            return (
                                <button
                                    key={key}
                                    className={`btn ${style}`}
                                    onClick={() => openAction(key)}
                                >
                                    <Icon size={20} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="page-content">
                <DataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    enableSelection={!readOnly && !!actions.delete && allowSelection}
                    rowAction={herziQueryByScreen[screenId] ? {
                        title: 'Search in Herzi',
                        icon: <HiSearch size={16} />,
                        onClick: handleRowHerziSearch,
                    } : null}
                    onSelectionChange={(ids, rows) => {
                        setSelectedIds(ids);
                        setSelectedRows(rows);
                    }}
                />
            </div>

            {activeAction && actions[activeAction] && (
                <ActionModal
                    action={actions[activeAction]}
                    initialValues={actionInitialValues}
                    onClose={() => {
                        setActiveAction(null);
                        setActionInitialValues({});
                    }}
                    onSubmit={handleActionSubmit}
                />
            )}

            {job && (
                <JobTracker job={job} onClose={() => { setJob(null); loadData(); }} />
            )}

            {showHerziResult && (
                <HerziResultModal
                    title="Herzi Search"
                    loading={herziLoading}
                    result={herziResult}
                    onClose={() => {
                        setShowHerziResult(false);
                        setHerziResult('');
                    }}
                />
            )}
        </div>
    );
}
