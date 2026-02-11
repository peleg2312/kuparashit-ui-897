/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import ActionModal from '../../components/ActionModal/ActionModal';
import JobTracker from '../../components/JobTracker/JobTracker';
import { getActionsForScreen } from '../../config/actions';
import { exchApi, kprApi, mainApi } from '../../api';
import { HiPlus, HiTrash, HiViewGrid } from 'react-icons/hi';
import './DashboardScreen.css';

const iconMap = {
    create: HiPlus,
    delete: HiTrash,
    createCluster: HiViewGrid,
    extend: HiPlus,
};

const btnStyleMap = {
    create: 'btn-primary',
    delete: 'btn-danger',
    createCluster: 'btn-secondary',
    extend: 'btn-secondary',
};

function buildDeleteInitialValues(action, selectedRows) {
    if (!action || !selectedRows.length) return {};
    const values = {};
    const names = selectedRows.map((row) => row.name).filter(Boolean);
    const first = selectedRows[0];

    action.params.forEach((param, index) => {
        if (index === 0) {
            if (param.multi) values[param.name] = names;
            else values[param.name] = names[0] || '';
            return;
        }
        if (param.name === 'vcenter' && first?.vcenter) values[param.name] = first.vcenter;
        if (param.name === 'cluster' && first?.cluster) values[param.name] = first.cluster;
    });

    return values;
}

export default function DashboardScreen({ screenId, title, subtitle, columns, fetchData, apiService, readOnly = false }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeAction, setActiveAction] = useState(null);
    const [actionInitialValues, setActionInitialValues] = useState({});
    const [job, setJob] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);

    const apiByName = {
        main: mainApi,
        kpr: kprApi,
        exch: exchApi,
    };
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
        const initialValues = key === 'delete'
            ? buildDeleteInitialValues(action, selectedRows)
            : {};
        setActionInitialValues(initialValues);
        setActiveAction(key);
    };

    const handleActionSubmit = async (values) => {
        const action = actions[activeAction];
        const payload = activeAction === 'delete'
            ? { ...values, selectedIds }
            : values;
        const api = apiByName[action.api] || apiService || kprApi;
        const result = await api.executeAction(action.endpoint, payload);
        setActiveAction(null);
        setActionInitialValues({});
        setJob(result);
        setSelectedIds([]);
        setSelectedRows([]);
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
                            const Icon = iconMap[key] || HiPlus;
                            const style = btnStyleMap[key] || 'btn-secondary';
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
                    enableSelection={!readOnly && !!actions.delete}
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
        </div>
    );
}
