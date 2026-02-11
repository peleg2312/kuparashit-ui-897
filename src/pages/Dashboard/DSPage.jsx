import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';

const columns = [
    { key: 'name', label: 'Name', filterable: false },
    { key: 'type', label: 'Type', filterable: true },
    { key: 'capacityTB', label: 'Capacity (TB)', filterable: false },
    { key: 'usedTB', label: 'Used (TB)', filterable: false },
    { key: 'freePercent', label: 'Free %', render: (v) => `${v}%` },
    { key: 'vcenter', label: 'vCenter', filterable: true },
    { key: 'location', label: 'Location', filterable: true },
    { key: 'vmCount', label: 'VMs' },
    { key: 'status', label: 'Status', filterable: true },
];

export default function DSPage() {
    return (
        <DashboardScreen
            screenId="ds"
            title="Datastore Management"
            subtitle="Storage datastores across all vCenters"
            columns={columns}
            fetchData={mainApi.getDatastores}
        />
    );
}
