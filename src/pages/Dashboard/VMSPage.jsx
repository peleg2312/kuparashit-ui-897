import { useState } from 'react';
import DashboardScreen from './DashboardScreen';
import { mainApi } from '../../api';
import { HiClipboardList, HiX } from 'react-icons/hi';

function NAAModal({ vm, onClose }) {
    const naaList = vm?.naaDevices || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ fontSize: '1.3rem' }}>NAA Devices</h3>
                        <p className="page-subtitle">{vm.name}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><HiX size={20} /></button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!naaList.length && <div className="badge badge-warning">No NAA mappings on this VM</div>}
                    {naaList.map((naa) => (
                        <div
                            key={naa.id}
                            style={{
                                border: '1px solid var(--border)',
                                background: 'var(--bg-input)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.86rem' }}>{naa.id}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span className="badge badge-info">{naa.size} GB</span>
                                <span className="badge badge-accent">{naa.type}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default function VMSPage() {
    const [selectedVM, setSelectedVM] = useState(null);

    const columns = [
        { key: 'name', label: 'Name', filterable: false, sortable: true },
        { key: 'ip', label: 'IP Address' },
        { key: 'os', label: 'OS', filterable: true },
        { key: 'cpu', label: 'vCPUs' },
        { key: 'memory', label: 'RAM (GB)' },
        { key: 'storage', label: 'Storage (GB)' },
        {
            key: 'naa',
            label: 'NAA Devices',
            render: (_, row) => {
                const count = row.naaDevices?.length || 0;
                if (!count) return <span className="badge badge-warning">No NAA</span>;
                return (
                    <button
                        className="btn btn-secondary"
                        style={{ minHeight: 34, padding: '6px 10px' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedVM(row); }}
                    >
                        <HiClipboardList size={15} />
                        {count} items
                    </button>
                );
            },
        },
        { key: 'vcenter', label: 'vCenter', filterable: true },
        { key: 'status', label: 'Status', filterable: true },
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
            />
            {selectedVM && <NAAModal vm={selectedVM} onClose={() => setSelectedVM(null)} />}
        </>
    );
}
