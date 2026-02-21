import { useState } from 'react';
import { HiClipboardList } from 'react-icons/hi';
import { mainApi } from '../../api';
import ObjectUrlCell from '../../components/DataTable/ObjectUrlCell';
import CopyableListModal from '../../components/Modal/CopyableListModal';
import { formatSizeFromGb, parseNaaList } from '../../utils/dashboardHandlers';
import DashboardScreen from './DashboardScreen';

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
            {naaPopup && (
                <CopyableListModal
                    title="NAA List"
                    subtitle={`${naaPopup.length} items`}
                    items={naaPopup}
                    copySuccessMessage="Copied NAA list"
                    onClose={handleNaaPopupClose}
                />
            )}
        </>
    );
}
