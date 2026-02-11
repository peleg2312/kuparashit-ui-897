// ── Mock Data for Demo ──────────────────────

// 20 vCenter servers
export const vcenters = Array.from({ length: 20 }, (_, i) => ({
    id: `vc-${i + 1}`,
    name: `VC-${['TLV', 'NYC', 'LON', 'FRA', 'SIN'][i % 5]}-${String(Math.floor(i / 5) + 1).padStart(2, '0')}`,
    location: ['Tel Aviv', 'New York', 'London', 'Frankfurt', 'Singapore'][i % 5],
    status: i % 7 === 0 ? 'warning' : 'healthy',
    version: `7.0.${3 + (i % 3)}`,
    vmCount: 40 + Math.floor(Math.random() * 200),
}));

// ~50 VMs
export const vms = Array.from({ length: 50 }, (_, i) => {
    const vc = vcenters[i % 20];
    const types = ['web', 'db', 'app', 'cache', 'proxy', 'worker', 'api', 'queue'];
    const envs = ['prod', 'stg', 'dev', 'qa'];
    return {
        id: `vm-${i + 1}`,
        name: `${types[i % 8]}-${envs[i % 4]}-${String(i + 1).padStart(3, '0')}`,
        vcenter: vc.name,
        vcenterId: vc.id,
        location: vc.location,
        status: ['running', 'running', 'running', 'stopped', 'suspended'][i % 5],
        cpu: [2, 4, 8, 16, 32][i % 5],
        memory: [4, 8, 16, 32, 64][i % 5],
        storage: [50, 100, 200, 500, 1000][i % 5],
        os: ['CentOS 7', 'Ubuntu 22.04', 'RHEL 8', 'Windows 2019', 'Debian 11'][i % 5],
        ip: `10.${10 + (i % 5)}.${Math.floor(i / 5)}.${(i % 254) + 1}`,
        createdAt: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
        naaDevices: Array.from({ length: i % 4 === 0 ? 0 : ((i % 3) + 1) }).map((__, n) => ({
            id: `naa.${Math.random().toString(16).slice(2, 34)}`,
            size: [50, 100, 200, 500][n % 4],
            type: ['VMFS', 'RDM'][n % 2],
        })),
    };
});

// ~30 Datastores
export const datastores = Array.from({ length: 30 }, (_, i) => {
    const vc = vcenters[i % 20];
    const types = ['VMFS', 'NFS', 'vSAN'];
    return {
        id: `ds-${i + 1}`,
        name: `DS-${vc.name}-${['SSD', 'HDD', 'NVMe'][i % 3]}-${String(i + 1).padStart(2, '0')}`,
        vcenter: vc.name,
        vcenterId: vc.id,
        location: vc.location,
        type: types[i % 3],
        capacityTB: [2, 5, 10, 20, 50][i % 5],
        usedTB: parseFloat(([1.2, 3.1, 7.5, 14.2, 35.8][i % 5]).toFixed(1)),
        freePercent: [40, 38, 25, 29, 28][i % 5],
        status: i % 10 === 0 ? 'maintenance' : 'online',
        vmCount: 5 + Math.floor(Math.random() * 30),
    };
});

// ~20 ESX Hosts
export const esxHosts = Array.from({ length: 20 }, (_, i) => {
    const vc = vcenters[i % 20];
    return {
        id: `esx-${i + 1}`,
        name: `ESX-${vc.name}-${String(i + 1).padStart(2, '0')}`,
        vcenter: vc.name,
        vcenterId: vc.id,
        location: vc.location,
        ip: `10.${20 + (i % 5)}.${Math.floor(i / 5)}.${(i % 254) + 1}`,
        cpu: [32, 64, 96, 128][i % 4],
        memory: [128, 256, 512, 768][i % 4],
        vmCount: 5 + Math.floor(Math.random() * 20),
        status: i % 8 === 0 ? 'maintenance' : 'connected',
        version: `7.0.${3 + (i % 2)}`,
        cluster: `Cluster-${String(Math.floor(i / 4) + 1).padStart(2, '0')}`,
    };
});

export const clustersByVcenter = esxHosts.reduce((acc, host) => {
    if (!acc[host.vcenter]) acc[host.vcenter] = [];
    if (!acc[host.vcenter].includes(host.cluster)) acc[host.vcenter].push(host.cluster);
    return acc;
}, {});

export const esxByCluster = esxHosts.reduce((acc, host) => {
    if (!acc[host.cluster]) acc[host.cluster] = [];
    acc[host.cluster].push(host.name);
    return acc;
}, {});

// ~15 RDMs
export const rdms = Array.from({ length: 15 }, (_, i) => {
    const vm = vms[i % 50];
    const vc = vcenters[i % 20];
    return {
        id: `rdm-${i + 1}`,
        name: `RDM-${String(i + 1).padStart(3, '0')}`,
        vmName: vm.name,
        vcenter: vc.name,
        vcenterId: vc.id,
        location: vc.location,
        sizeGB: [50, 100, 200, 500, 1000][i % 5],
        naaId: `naa.${Math.random().toString(16).slice(2, 34)}`,
        status: 'active',
        compatMode: i % 2 === 0 ? 'physical' : 'virtual',
    };
});

// EXCH volumes
export const exchVolumes = Array.from({ length: 12 }, (_, i) => ({
    id: `vol-${i + 1}`,
    name: `VOL-${['PROD', 'STG', 'DEV'][i % 3]}-${String(i + 1).padStart(3, '0')}`,
    aggregate: `AGG-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
    sizeGB: [500, 1000, 2000, 5000][i % 4],
    usedGB: [320, 780, 1540, 3200][i % 4],
    protocol: ['NFS', 'CIFS', 'iSCSI', 'FC'][i % 4],
    status: i % 6 === 0 ? 'offline' : 'online',
    location: ['Tel Aviv', 'New York', 'London'][i % 3],
    vcenter: vcenters[i % 20].name,
}));

// QTREE items
export const qtrees = Array.from({ length: 15 }, (_, i) => ({
    id: `qt-${i + 1}`,
    name: `QT-${['SHARE', 'BACKUP', 'DATA'][i % 3]}-${String(i + 1).padStart(3, '0')}`,
    volume: exchVolumes[i % 12].name,
    securityStyle: ['unix', 'ntfs', 'mixed'][i % 3],
    exportPolicy: i % 2 === 0 ? 'default' : `policy-${i}`,
    status: 'active',
    sizeGB: [100, 250, 500, 750][i % 4],
    location: ['Tel Aviv', 'New York', 'London'][i % 3],
    vcenter: vcenters[i % 20].name,
}));

// Demo users
export const users = [
    { id: 'u1', name: 'Admin User', email: 'admin@company.com', role: 'admin', teams: ['BLOCK', 'NASA'], avatar: null },
    { id: 'u2', name: 'Sarah Cohen', email: 'sarah@company.com', role: 'operator', teams: ['BLOCK'], avatar: null },
    { id: 'u3', name: 'John Smith', email: 'john@company.com', role: 'viewer', teams: ['NASA'], avatar: null },
    { id: 'u4', name: 'Maya Levi', email: 'maya@company.com', role: 'operator', teams: ['BLOCK', 'NASA'], avatar: null },
    { id: 'u5', name: 'David Kim', email: 'david@company.com', role: 'admin', teams: ['BLOCK'], avatar: null },
];

// Current logged-in user
export const currentUser = users[0];

// Dropdown lists from API
export const dropdownData = {
    '/vms/names': vms.map(vm => vm.name),
    '/vcenters': vcenters.map(vc => vc.name),
    '/datastores/names': datastores.map(ds => ds.name),
    '/rdm/names': rdms.map(r => r.name),
    '/esx/names': esxHosts.map(e => e.name),
    '/volumes': exchVolumes.map(v => v.name),
    '/qtrees': qtrees.map(q => q.name),
    '/aggregates': ['AGG-01', 'AGG-02', 'AGG-03', 'AGG-04', 'AGG-05'],
    '/clusters/by-vc': clustersByVcenter,
    '/esx/by-cluster': esxByCluster,
};

// Job execution mock
export function createMockJob(actionLabel) {
    return {
        jobId: `JOB-${Date.now()}`,
        action: actionLabel,
        steps: [
            { name: 'Validating parameters', status: 'pending', duration: 1500 },
            { name: 'Connecting to storage', status: 'pending', duration: 2000 },
            { name: 'Executing operation', status: 'pending', duration: 3000 },
            { name: 'Verifying result', status: 'pending', duration: 1500 },
        ],
    };
}

// Herzi tools mock responses
export const herziMockResults = {
    '/herzi/vc-info': (input) => `vCenter: ${input}\nVersion: 7.0.3\nHost Count: 12\nVM Count: 156\nStatus: Healthy`,
    '/herzi/vc-health': () => `Status: Healthy\nCPU Usage: 45%\nMemory: 62%\nStorage: 71%\nAlarms: 0`,
    '/herzi/vm-lookup': (input) => `VM: ${input}\nvCenter: VC-TLV-01\nHost: ESX-TLV-01\nIP: 10.10.0.45\nStatus: Running`,
    '/herzi/vm-snapshot': (input) => `VM: ${input}\nSnapshots: 3\nOldest: 2025-01-15\nTotal Size: 12.5 GB`,
    '/herzi/ds-usage': (input) => `Datastore: ${input}\nCapacity: 10 TB\nUsed: 7.5 TB\nFree: 25%\nVMs: 23`,
    '/herzi/ds-vms': (input) => `Datastore: ${input}\n\nVMs:\n1. web-prod-001\n2. db-prod-005\n3. app-stg-012\n4. cache-dev-003`,
    '/herzi/naa-lookup': (input) => `NAA: ${input}\nType: VMFS\nDatastore: DS-TLV-SSD-01\nCapacity: 500 GB\nStatus: Active`,
    '/herzi/naa-mapping': (input) => `NAA: ${input}\nMapped to: DS-NYC-HDD-05\nHost: ESX-NYC-03\nLUN ID: 12`,
    '/herzi/vm-naa': (input) => `VM: ${input}\n\nNAA Devices:\n1. naa.abc123... (100 GB)\n2. naa.def456... (200 GB)`,
};

// Price calculation mock
export const priceCalculator = {
    NETAPP: (params) => ({
        price: (params.size * 0.15 + (params.iops || 0) * 0.005).toFixed(2),
        monthlyCost: (params.size * 0.15 * 30).toFixed(2),
        iopsAllocated: params.iops || 1000,
        throughput: `${Math.round((params.iops || 1000) * 0.032)} MB/s`,
        tier: params.size > 5000 ? 'Enterprise' : params.size > 1000 ? 'Standard' : 'Basic',
    }),
    PFLEX: (params) => ({
        price: (params.size * 0.12 + (params.replicas || 1) * 50).toFixed(2),
        monthlyCost: (params.size * 0.12 * 30 + (params.replicas || 1) * 50 * 30).toFixed(2),
        replicaCount: params.replicas || 1,
        compressionRatio: '2.3:1',
        effectiveCapacity: `${(params.size * 2.3).toFixed(0)} GB`,
    }),
    PMAX: (params) => ({
        price: (params.size * 0.20 + (params.srdf ? 200 : 0)).toFixed(2),
        monthlyCost: (params.size * 0.20 * 30 + (params.srdf ? 200 * 30 : 0)).toFixed(2),
        srdfEnabled: params.srdf || false,
        raidLevel: 'RAID 6',
        cacheHitRate: '94%',
    }),
};
