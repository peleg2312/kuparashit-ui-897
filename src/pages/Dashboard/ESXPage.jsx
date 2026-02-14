import { useEffect, useRef, useState } from 'react';
import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';
import Toast from '../../components/Toast/Toast';
import { copyListToClipboard } from '../../utils/clipboardHandlers';

export default function ESXPage() {
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
        toastTimerRef.current = window.setTimeout(() => setToast(''), 2400);
    };

    const copyPwwns = async (values) => {
        try {
            const result = await copyListToClipboard(values);
            if (!result.copied) return;
            showToast(`Copied ${result.count} PWWNs`, 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    const handlePwwnDoubleClick = (event, values) => {
        event.stopPropagation();
        copyPwwns(values);
    };

    const createPwwnDoubleClickHandler = (values) => (event) => handlePwwnDoubleClick(event, values);

    const renderPwwnsCell = (values) => {
        if (!Array.isArray(values)) return '';
        return (
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
                {values.map((item) => (
                    <button
                        key={item}
                        className="badge badge-info"
                        style={{ fontFamily: 'JetBrains Mono, monospace', border: 'none', cursor: 'copy' }}
                        title="Double-click to copy all PWWNs in this row"
                        onDoubleClick={createPwwnDoubleClickHandler(values)}
                    >
                        {item}
                    </button>
                ))}
            </span>
        );
    };

    const columns = [
        { key: 'name', label: 'Name', filterable: true },
        { key: 'vc', label: 'vCenter', filterable: true },
        { key: 'esx_cluster', label: 'ESX Cluster', filterable: true },
        {
            key: 'pwwns',
            label: 'PWWNs',
            render: renderPwwnsCell,
            filterable: true
        },
    ];

    return (
        <>
            <DashboardScreen
                screenId="esx"
                title="ESX Host Management"
                subtitle="ESXi hypervisor hosts across all vCenters"
                columns={columns}
                fetchData={mainApi.getESXHosts}
            />
            <Toast message={toast} type={toastType} onClose={() => setToast('')} />
        </>
    );
}
