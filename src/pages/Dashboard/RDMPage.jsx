import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';

const columns = [
    { key: 'name', label: 'Name', filterable: false },
    { key: 'vmName', label: 'VM', filterable: true },
    { key: 'sizeGB', label: 'Size (GB)', filterable: false },
    { key: 'vcenter', label: 'vCenter', filterable: true },
    { key: 'location', label: 'Location', filterable: true },
    { key: 'compatMode', label: 'Compat Mode', filterable: true },
    { key: 'naaId', label: 'NAA ID', render: (v) => v ? `${v.substring(0, 20)}...` : '' },
    { key: 'status', label: 'Status', filterable: true },
];

export default function RDMPage() {
    return (
        <DashboardScreen
            screenId="rdm"
            title="RDM Management"
            subtitle="Raw Device Mappings across all vCenters"
            columns={columns}
            fetchData={mainApi.getRDMs}
        />
    );
}
