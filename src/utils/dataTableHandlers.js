export function parseSizeToGb(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;

    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(gb|g|tb|t)$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount)) return null;
    return unit === 'tb' || unit === 't' ? amount * 1024 : amount;
}

export function getRowId(row, idx = 0) {
    return row.id
        || [row.vc, row.esx_cluster, row.ds_cluster, row.name, row.naa].filter(Boolean).join('::')
        || `${idx}`;
}

function resolveClusterValue(row) {
    return row.cluster || row.ds_cluster || row.esx_cluster || '';
}

export function getRowClusterKey(row) {
    const cluster = resolveClusterValue(row);
    if (!cluster) return '';
    const vc = row.vc || row.vcenter || '';
    return `${vc}::${cluster}`;
}

export function buildFilterOptions(columns, data) {
    const options = {};
    columns.filter((column) => column.filterable).forEach((column) => {
        options[column.key] = [...new Set(data.map((row) => row[column.key]).filter(Boolean))].sort();
    });
    return options;
}

export function applyTableTransforms({ data, search, columns, filters, sortBy, sortDir }) {
    let result = data;

    if (search) {
        const query = search.toLowerCase();
        result = result.filter((row) =>
            columns.some((column) => String(row[column.key] || '').toLowerCase().includes(query)),
        );
    }

    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '__all__') {
            result = result.filter((row) => String(row[key]) === value);
        }
    });

    if (sortBy) {
        result = [...result].sort((a, b) => {
            const av = a[sortBy];
            const bv = b[sortBy];
            if (av == null) return 1;
            if (bv == null) return -1;

            const avSize = parseSizeToGb(av);
            const bvSize = parseSizeToGb(bv);
            if (avSize != null && bvSize != null) {
                return sortDir === 'asc' ? avSize - bvSize : bvSize - avSize;
            }

            if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    }

    return result;
}

export function getSelectedRowsByIds(rows, selectedIds) {
    return rows.filter((row, idx) => selectedIds.includes(getRowId(row, idx)));
}

export function getSelectionClusterKey(rows, selectedIds) {
    const selectedRows = getSelectedRowsByIds(rows, selectedIds);
    if (!selectedRows.length) return '';
    return getRowClusterKey(selectedRows[0]);
}

export function getStatusClass(status) {
    const value = String(status).toLowerCase();
    if (['running', 'healthy', 'online', 'connected', 'active'].includes(value)) return 'badge-success';
    if (['stopped', 'offline', 'failed', 'error'].includes(value)) return 'badge-error';
    if (['warning', 'maintenance', 'suspended'].includes(value)) return 'badge-warning';
    return 'badge-info';
}
