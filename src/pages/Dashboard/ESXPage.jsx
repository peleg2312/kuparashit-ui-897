import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';

const columns = [
    { key: 'name', label: 'Name', filterable: false },
    { key: 'ip', label: 'IP Address' },
    { key: 'cpu', label: 'CPU Cores' },
    { key: 'memory', label: 'RAM (GB)' },
    { key: 'vmCount', label: 'VMs' },
    { key: 'cluster', label: 'Cluster', filterable: true },
    { key: 'vcenter', label: 'vCenter', filterable: true },
    { key: 'location', label: 'Location', filterable: true },
    { key: 'version', label: 'Version' },
    { key: 'status', label: 'Status', filterable: true },
];

export default function ESXPage() {
    return (
        <DashboardScreen
            screenId="esx"
            title="ESX Host Management"
            subtitle="ESXi hypervisor hosts across all vCenters"
            columns={columns}
            fetchData={mainApi.getESXHosts}
        />
    );
}
