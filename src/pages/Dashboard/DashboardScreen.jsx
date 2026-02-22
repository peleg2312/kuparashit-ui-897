import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '../../components/DataTable/DataTable';
import ActionModal from '../../components/ActionModal/ActionModal';
import JobTracker from '../../components/JobTracker/JobTracker';
import { getActionsForScreen } from '../../config/actions';
import { herziApi } from '../../api';
import { HiPlus, HiRefresh, HiSearch, HiX } from 'react-icons/hi';
import { resolveActionApi, resolveActionEndpoint } from '../../utils/actions/actionApi';
import { actionButtonStyleMap, actionIconMap } from '../../utils/actions/actionPresentation';
import { normalizeActionPayload } from '../../utils/actions/actionPayload';
import { buildActionInitialValues } from '../../utils/actions/actionPrefill';
import HerziResultView from '../../components/HerziTools/HerziResultView';
import HerziMultiResultPopup from '../../components/HerziTools/HerziMultiResultPopup';
import { copyListToClipboard, copyTextToClipboard } from '../../utils/clipboardHandlers';
import { buildHerziQueryUrl, formatHerziToolResult } from '../../utils/herziHandlers';
import {
    herziQueryByScreen,
} from '../../utils/dashboardScreenHandlers';
import '../../pages/HerziToolsPage.css';
import './DashboardScreen.css';

function HerziResultModal({ title, subtitle, loading, result, responseUrl, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content dashboard-herzi-modal animate-scale" onClick={(e) => e.stopPropagation()}>
                <div className="dashboard-herzi-modal__header">
                    <div>
                        <p className="dashboard-herzi-modal__eyebrow">Query Result</p>
                        <h2 className="dashboard-herzi-modal__title">{title}</h2>
                        <p className="dashboard-herzi-modal__subtitle">{subtitle}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><HiX size={18} /></button>
                </div>

                <div className="dashboard-herzi-modal__meta">
                    <span className={`badge ${loading ? 'badge-info' : 'badge-success'} dashboard-herzi-modal__status`}>
                        {loading ? 'Running' : 'Completed'}
                    </span>
                </div>

                <div className="dashboard-herzi-modal__body">
                    {loading ? (
                        <div className="dashboard-herzi-modal__loading" role="status" aria-live="polite">
                            <div className="dashboard-herzi-modal__loading-head">
                                <HiRefresh size={16} className="animate-spin" />
                                Querying Herzi...
                            </div>
                            <div className="dashboard-herzi-modal__loading-line" />
                            <div className="dashboard-herzi-modal__loading-line dashboard-herzi-modal__loading-line--short" />
                        </div>
                    ) : (
                        <HerziResultView value={result} responseUrl={responseUrl} emptyText="No result" />
                    )}
                </div>

                <div className="dashboard-herzi-modal__footer">
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
    const [activeAction, setActiveAction] = useState(null);
    const [actionInitialValues, setActionInitialValues] = useState({});
    const [job, setJob] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [herziLoading, setHerziLoading] = useState(false);
    const [herziResult, setHerziResult] = useState('');
    const [herziResponseUrl, setHerziResponseUrl] = useState('');
    const [herziResultMode, setHerziResultMode] = useState('single');
    const [herziMultiState, setHerziMultiState] = useState({
        items: [],
        resultsByItem: {},
        responseUrlsByItem: {},
        queryUrl: '',
    });
    const [showHerziResult, setShowHerziResult] = useState(false);
    const [herziTitle, setHerziTitle] = useState('Herzi Search');
    const [herziSubtitle, setHerziSubtitle] = useState('Live Herzi query result');

    const actions = readOnly ? {} : getActionsForScreen(screenId);
    const herziConfig = herziQueryByScreen[screenId] || null;
    const {
        data = [],
        isFetching,
        error: loadErrorObj,
        isError: hasLoadError,
        refetch: refetchTableData,
    } = useQuery({
        queryKey: ['dashboard-table', screenId],
        queryFn: async () => {
            const rows = await fetchData();
            return Array.isArray(rows) ? rows : [];
        },
        enabled: typeof fetchData === 'function',
        retry: false,
        refetchOnWindowFocus: false,
    });
    const loading = isFetching;
    const loadError = hasLoadError ? (loadErrorObj?.message || 'Failed to load table data.') : '';

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
        const extraPayload = activeAction === 'delete' ? { selectedIds } : {};
        const payload = normalizeActionPayload(action, values, extraPayload);
        const api = resolveActionApi(action, apiService);
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
        setActionInitialValues({});
        setJob({
            ...result,
            message: result?.message || '',
            error: result?.error || '',
        });
        setSelectedIds([]);
        setSelectedRows([]);
    };

    const closeHerziResult = () => {
        setShowHerziResult(false);
        setHerziLoading(false);
        setHerziResult('');
        setHerziResponseUrl('');
        setHerziResultMode('single');
        setHerziMultiState({
            items: [],
            resultsByItem: {},
            responseUrlsByItem: {},
            queryUrl: '',
        });
        setHerziTitle('Herzi Search');
        setHerziSubtitle('Live Herzi query result');
    };

    const handleCopyHerziResult = async (value) => {
        try {
            await copyTextToClipboard(String(value || '').trim());
        } catch {
            // Keep copy failures non-blocking for dashboard flow.
        }
    };

    const handleCopyHerziList = async (values) => {
        try {
            await copyListToClipboard(values);
        } catch {
            // Keep copy failures non-blocking for dashboard flow.
        }
    };

    const handleRowHerziSearch = async (row) => {
        if (!herziConfig) return;

        const input = herziConfig.getInput(row);
        if (!input) return;

        setHerziResultMode('single');
        setHerziMultiState({
            items: [],
            resultsByItem: {},
            responseUrlsByItem: {},
            queryUrl: '',
        });
        setHerziTitle('Herzi Search');
        setHerziSubtitle('Live Herzi query result');
        setShowHerziResult(true);
        setHerziLoading(true);
        setHerziResponseUrl(buildHerziQueryUrl(herziConfig.endpoint, String(input)));
        try {
            const result = await herziApi.query(herziConfig.endpoint, String(input));
            setHerziResult(formatHerziToolResult(result));
        } catch (error) {
            setHerziResult(`Query failed: ${error?.message || 'unknown error'}`);
        } finally {
            setHerziLoading(false);
        }
    };

    const handleSelectedHerziSearch = async () => {
        if (!herziConfig || !selectedRows.length) return;

        const inputItems = [...new Set(
            selectedRows
                .map((row) => herziConfig.getInput(row))
                .map((value) => String(value || '').trim())
                .filter(Boolean),
        )];
        if (!inputItems.length) return;

        const queryInput = inputItems.length === 1 ? inputItems[0] : inputItems;
        setHerziTitle(inputItems.length > 1 ? `Herzi Search (${inputItems.length} items)` : 'Herzi Search');
        setHerziSubtitle(inputItems.length > 1 ? 'Bulk query result from selected rows' : 'Live Herzi query result');
        setHerziResultMode(inputItems.length > 1 ? 'multi' : 'single');
        setHerziMultiState({
            items: [],
            resultsByItem: {},
            responseUrlsByItem: {},
            queryUrl: buildHerziQueryUrl(herziConfig.endpoint, queryInput),
        });
        setShowHerziResult(true);
        setHerziLoading(true);
        setHerziResponseUrl(buildHerziQueryUrl(herziConfig.endpoint, queryInput));
        try {
            if (inputItems.length === 1) {
                const result = await herziApi.query(herziConfig.endpoint, queryInput);
                setHerziResult(formatHerziToolResult(result));
                return;
            }

            const settledResults = await Promise.allSettled(
                inputItems.map((item) => herziApi.query(herziConfig.endpoint, item)),
            );
            const resultsByItem = {};
            const responseUrlsByItem = {};

            inputItems.forEach((item, index) => {
                const result = settledResults[index];
                responseUrlsByItem[item] = buildHerziQueryUrl(herziConfig.endpoint, item);
                if (result?.status === 'fulfilled') {
                    resultsByItem[item] = formatHerziToolResult(result.value);
                    return;
                }
                resultsByItem[item] = `Query failed: ${result?.reason?.message || 'unknown error'}`;
            });

            setHerziMultiState({
                items: inputItems,
                resultsByItem,
                responseUrlsByItem,
                queryUrl: buildHerziQueryUrl(herziConfig.endpoint, queryInput),
            });
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
                        {herziConfig && selectedRows.length > 0 && (
                            <button className="btn btn-secondary" onClick={handleSelectedHerziSearch}>
                                <HiSearch size={20} />
                                Herzi Selected ({selectedRows.length})
                            </button>
                        )}
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
                {!!loadError && (
                    <div
                        style={{
                            marginBottom: 12,
                            border: '1px solid var(--error)',
                            color: 'var(--error)',
                            background: 'color-mix(in srgb, var(--error), transparent 92%)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 12px',
                            fontSize: '0.9rem',
                        }}
                    >
                        {loadError}
                    </div>
                )}
                <DataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    enableSelection={!readOnly && allowSelection && (!!actions.delete || !!herziConfig)}
                    rowAction={herziConfig ? {
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
                    actionKey={activeAction}
                    screenId={screenId}
                    initialValues={actionInitialValues}
                    onClose={() => {
                        setActiveAction(null);
                        setActionInitialValues({});
                    }}
                    onSubmit={handleActionSubmit}
                />
            )}

            {job && (
                <JobTracker
                    job={job}
                    onClose={() => {
                        setJob(null);
                        void refetchTableData();
                    }}
                />
            )}

            {showHerziResult && herziResultMode === 'multi' && !herziLoading && herziMultiState.items.length > 1 ? (
                <HerziMultiResultPopup
                    title={herziTitle}
                    items={herziMultiState.items}
                    resultsByItem={herziMultiState.resultsByItem}
                    responseUrlsByItem={herziMultiState.responseUrlsByItem}
                    queryUrl={herziMultiState.queryUrl}
                    onClose={closeHerziResult}
                    onCopyResult={handleCopyHerziResult}
                    onCopyList={handleCopyHerziList}
                />
            ) : showHerziResult ? (
                <HerziResultModal
                    title={herziTitle}
                    subtitle={herziSubtitle}
                    loading={herziLoading}
                    result={herziResult}
                    responseUrl={herziResponseUrl}
                    onClose={closeHerziResult}
                />
            ) : null}
        </div>
    );
}
