import { useState } from 'react';
import { mainApi } from '../../api';
import ObjectUrlCell from '../../components/DataTable/ObjectUrlCell';
import CopyableListModal from '../../components/Modal/CopyableListModal';
import DashboardScreen from './DashboardScreen';

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
        if (!values.length) return <span className="badge badge-warning">No NAAs Found for vm</span>;
        return (
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                        key={'Click to view NAAs'}
                        className="badge badge-accent"
                        style={{ fontFamily: 'JetBrains Mono, monospace', border: 'none', cursor: 'pointer' }}
                        onClick={createNaaChipClickHandler(row.name, values)}
                    >
                        {'Click to view NAAs'}
                    </button>
            </span>
        );
    };

    const columns = [
        { key: 'name', label: 'Name', filterable: true, sortable: true, width: '15%' },
        {
            key: 'naas_of_rdms',
            label: 'NAAs Of RDMs',
            width: '20%',
            render: renderVmNaaCell,
            filterable: true,
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
                <CopyableListModal
                    title="VM NAA List"
                    subtitle={naaPopup.vmName}
                    items={naaPopup.list}
                    copySuccessMessage={`Copied NAA list for ${naaPopup.vmName}`}
                    onClose={handleNaaPopupClose}
                />
            )}
        </>
    );
}
