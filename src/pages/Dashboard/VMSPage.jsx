import { useEffect, useRef, useState } from 'react';
import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';
import ObjectUrlCell from '../../components/DataTable/ObjectUrlCell';
import { HiX } from 'react-icons/hi';
import Toast from '../../components/Toast/Toast';
import { copyListToClipboard } from '../../utils/clipboardHandlers';

function VMNaaListModal({ vmName, list, onClose }) {
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState('success');
    const toastTimerRef = useRef(null);

    useEffect(() => () => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    }, []);

    const showToast = (message, type = 'success') => {
        setToast(message);
        setToastType(type);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(''), 2600);
    };

    const copyAll = async () => {
        try {
            await copyListToClipboard(list);
            showToast(`Copied NAA list for ${vmName}`, 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>VM NAA List</h3>
                        <p className="page-subtitle">{vmName}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><HiX size={20} /></button>
                </div>
                <div className="modal-body" style={{ display: 'grid', gap: 8 }}>
                    {list.map((item) => (
                        <div
                            key={item}
                            style={{
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                background: 'var(--bg-input)',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '0.84rem',
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={copyAll}>Copy All</button>
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
            <Toast message={toast} type={toastType} onClose={() => setToast('')} />
        </div>
    );
}

export default function VMSPage() {
    const [naaPopup, setNaaPopup] = useState(null);

    const handleNaaPopupClose = () => setNaaPopup(null);

    const handleNaaChipClick = (event, rowName, naaList) => {
        event.stopPropagation();
        setNaaPopup({ vmName: rowName, list: naaList });
    };

    const createNaaChipClickHandler = (rowName, naaList) => (event) => handleNaaChipClick(event, rowName, naaList);

    const renderVmNaaCell = (values, row) => {
        if (!Array.isArray(values)) return '';
        if (!values.length) return <span className="badge badge-warning">none</span>;

        return (
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
                {values.map((item) => (
                    <button
                        key={item}
                        className="badge badge-accent"
                        style={{ fontFamily: 'JetBrains Mono, monospace', border: 'none', cursor: 'pointer' }}
                        onClick={createNaaChipClickHandler(row.name, values)}
                    >
                        {item}
                    </button>
                ))}
            </span>
        );
    };

    const columns = [
        { key: 'name', label: 'Name', filterable: true, sortable: true, width: '15%' },
        {
            key: 'naas_of_rdms',
            label: 'NAAs Of RDMs',
            width: '60%',
            render: renderVmNaaCell,
            filterable: true
        },
        { key: 'datastore', label: 'Datastore', filterable: true },
        { key: 'vc', label: 'vCenter', filterable: true },
        { key: 'url', label: 'URL', filterable: false, sortable: false, render: (value) => <ObjectUrlCell value={value} /> },
    ];

    return (
        <>
            <DashboardScreen
                screenId="vms"
                title="Virtual Machines"
                subtitle="All VMs across all vCenters"
                columns={columns}
                fetchData={mainApi.getVMs}
                readOnly={true}
                allowSelection={false}
            />
            {naaPopup && (
                <VMNaaListModal
                    vmName={naaPopup.vmName}
                    list={naaPopup.list}
                    onClose={handleNaaPopupClose}
                />
            )}
        </>
    );
}
