import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';
import { formatSizeFromGb } from '../../utils/dashboardHandlers';

const columns = [
    { key: 'name', label: 'Name', filterable: true },
    { key: 'vc', label: 'vCenter', filterable: true },
    { key: 'ds_cluster', label: 'DS Cluster', filterable: true },
    { key: 'size', label: 'Size', filterable: true, render: formatSizeFromGb },
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
