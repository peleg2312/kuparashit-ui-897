import { useEffect, useRef, useState } from 'react';
import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';
import ObjectUrlCell from '../../components/DataTable/ObjectUrlCell';
import { HiClipboardList, HiX } from 'react-icons/hi';
import Toast from '../../components/Toast/Toast';
import { formatSizeFromGb, parseNaaList } from '../../utils/dashboardHandlers';
import { copyListToClipboard } from '../../utils/clipboardHandlers';

function NaaListModal({ list, onClose }) {
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
        toastTimerRef.current = window.setTimeout(() => setToast(''), 2300);
    };

    const copyAll = async () => {
        try {
            await copyListToClipboard(list);
            showToast('Copied NAA list', 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>NAA List</h3>
                        <p className="page-subtitle">{list.length} items</p>
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

export default function RDMPage() {
    const [naaPopup, setNaaPopup] = useState(null);

    const handleNaaPopupClose = () => setNaaPopup(null);

    const handleNaaCountClick = (event, list) => {
        event.stopPropagation();
        setNaaPopup(list);
    };

    const createNaaCountClickHandler = (list) => (event) => handleNaaCountClick(event, list);

    const renderNaaCell = (value) => {
        const list = parseNaaList(value);
        if (list.length > 2) {
            return (
                <button
                    className="btn btn-secondary"
                    style={{ minHeight: 36, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 10 }}
                    onClick={createNaaCountClickHandler(list)}
                >
                    <HiClipboardList size={15} />
                    <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{list.length}</span>
                    <span style={{ opacity: 0.9 }}>NAAs</span>
                </button>
            );
        }
        return list.join(', ');
    };

    const renderConnectedCell = (value) => (value ? 'true' : 'false');

    const columns = [
        {
            key: 'naa',
            label: 'NAA',
            filterable: false,
            render: renderNaaCell,
        },
        { key: 'vc', label: 'vCenter', filterable: true },
        { key: 'esx_cluster', label: 'ESX Cluster', filterable: true },
        { key: 'size', label: 'Size', filterable: false, render: formatSizeFromGb },
        { key: 'connected', label: 'Connected', filterable: true, render: renderConnectedCell },
        { key: 'url', label: 'URL', filterable: false, sortable: false, render: (value) => <ObjectUrlCell value={value} /> },
    ];

    return (
        <>
            <DashboardScreen
                screenId="rdm"
                title="RDM Management"
                subtitle="Raw Device Mappings across all vCenters"
                columns={columns}
                fetchData={mainApi.getRDMs}
            />
            {naaPopup && <NaaListModal list={naaPopup} onClose={handleNaaPopupClose} />}
        </>
    );
}
