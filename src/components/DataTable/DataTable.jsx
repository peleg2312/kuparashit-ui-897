import { useState, useMemo } from 'react';
import { HiSearch, HiFilter, HiChevronLeft, HiChevronRight, HiChevronDown } from 'react-icons/hi';
import './DataTable.css';

export default function DataTable({
    columns,
    data,
    loading = false,
    onRowClick,
    enableSelection = false,
    onSelectionChange
}) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selected, setSelected] = useState([]);
    const pageSize = 14;

    // Get unique values for filter dropdowns
    const filterOptions = useMemo(() => {
        const opts = {};
        columns.filter(c => c.filterable).forEach(col => {
            opts[col.key] = [...new Set(data.map(row => row[col.key]).filter(Boolean))].sort();
        });
        return opts;
    }, [columns, data]);

    // Filter + Search
    const filtered = useMemo(() => {
        let result = data;

        // Apply search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(row =>
                columns.some(col => String(row[col.key] || '').toLowerCase().includes(q))
            );
        }

        // Apply filters
        Object.entries(filters).forEach(([key, val]) => {
            if (val && val !== '__all__') {
                result = result.filter(row => String(row[key]) === val);
            }
        });

        // Sort
        if (sortBy) {
            result = [...result].sort((a, b) => {
                const av = a[sortBy], bv = b[sortBy];
                if (av == null) return 1;
                if (bv == null) return -1;
                if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
                return sortDir === 'asc'
                    ? String(av).localeCompare(String(bv))
                    : String(bv).localeCompare(String(av));
            });
        }

        return result;
    }, [data, search, filters, sortBy, sortDir, columns]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pagedData = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Selection Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const pageIds = pagedData.map((row) => row.id);
            const newSel = [...new Set([...selected, ...pageIds])];
            setSelected(newSel);
            onSelectionChange?.(newSel, filtered.filter((row) => newSel.includes(row.id)));
        } else {
            const pageIds = new Set(pagedData.map((row) => row.id));
            const newSel = selected.filter((id) => !pageIds.has(id));
            setSelected(newSel);
            onSelectionChange?.(newSel, filtered.filter((row) => newSel.includes(row.id)));
        }
    };

    const handleSelectRow = (id) => {
        setSelected(prev => {
            const newSel = prev.includes(id)
                ? prev.filter(Pid => Pid !== id)
                : [...prev, id];
            onSelectionChange?.(newSel, filtered.filter((row) => newSel.includes(row.id)));
            return newSel;
        });
    };

    const isAllSelected = pagedData.length > 0 && pagedData.every(r => selected.includes(r.id));
    const isIndeterminate = pagedData.some(r => selected.includes(r.id)) && !isAllSelected;

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const handleFilterChange = (key, val) => {
        setFilters(f => ({ ...f, [key]: val }));
        setPage(1);
    };

    const activeFilterCount = Object.values(filters).filter(v => v && v !== '__all__').length;

    const getStatusClass = (status) => {
        const s = String(status).toLowerCase();
        if (['running', 'healthy', 'online', 'connected', 'active'].includes(s)) return 'badge-success';
        if (['stopped', 'offline', 'failed', 'error'].includes(s)) return 'badge-error';
        if (['warning', 'maintenance', 'suspended'].includes(s)) return 'badge-warning';
        return 'badge-info';
    };

    return (
        <div className="data-table-wrapper">
            {/* Toolbar */}
            <div className="dt-toolbar">
                <div className="dt-search">
                    <HiSearch size={20} className="dt-search-icon" />
                    <input
                        className="dt-search-input"
                        placeholder="Search across all columns..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="dt-toolbar-actions">
                    {columns.some((col) => col.filterable) && (
                        <button
                            className={`btn btn-secondary btn-sm ${activeFilterCount > 0 ? 'btn--active-filter' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <HiFilter size={18} />
                            Filters
                            {activeFilterCount > 0 && <span className="dt-filter-badge">{activeFilterCount}</span>}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <div className="dt-filters animate-slide-down">
                    {columns.filter(c => c.filterable).map(col => (
                        <div key={col.key} className="dt-filter-group">
                            <label className="dt-filter-label">{col.label}</label>
                            <div className="select-wrapper">
                                <select
                                    className="select-field select-sm"
                                    value={filters[col.key] || '__all__'}
                                    onChange={e => handleFilterChange(col.key, e.target.value)}
                                >
                                    <option value="__all__">All</option>
                                    {(filterOptions[col.key] || []).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                    {activeFilterCount > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({}); setPage(1); }}>
                            Clear All
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="dt-container">
                {loading ? (
                    <div className="dt-loading">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="dt-skeleton-row">
                                <div className="skeleton dt-skeleton-check" />
                                {columns.map((_, j) => (
                                    <div key={j} className="skeleton dt-skeleton-cell" />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="dt-table">
                        <thead>
                            <tr>
                                {enableSelection && (
                                    <th className="dt-th dt-th-check">
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={isAllSelected}
                                            ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                )}
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        className={`dt-th ${col.sortable !== false ? 'dt-th--sortable' : ''}`}
                                        onClick={() => col.sortable !== false && handleSort(col.key)}
                                        style={{ width: col.width }}
                                    >
                                        <div className="dt-th-content">
                                            <span>{col.label}</span>
                                            {sortBy === col.key && (
                                                <HiChevronDown
                                                    size={16}
                                                    className={`dt-sort-icon ${sortDir === 'desc' ? 'dt-sort-icon--desc' : ''}`}
                                                />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="dt-empty">
                                        <div className="dt-empty-state">
                                            <div className="dt-empty-icon">?</div>
                                            <p>No results found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((row) => {
                                    const isSelected = selected.includes(row.id);
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`dt-row ${isSelected ? 'dt-row--selected' : ''}`}
                                            onClick={() => {
                                                if (enableSelection) {
                                                    handleSelectRow(row.id);
                                                    return;
                                                }
                                                onRowClick?.(row);
                                            }}
                                        >
                                            {enableSelection && (
                                                <td className="dt-td dt-td-check" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(row.id)}
                                                    />
                                                </td>
                                            )}
                                            {columns.map(col => (
                                                <td key={col.key} className="dt-td">
                                                    {col.key === 'status' ? (
                                                        <span className={`badge ${getStatusClass(row[col.key])}`}>{row[col.key]}</span>
                                                    ) : col.render ? (
                                                        col.render(row[col.key], row)
                                                    ) : (
                                                        row[col.key]
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            <div className="dt-pagination">
                <div className="dt-pagination-info">
                    Showing <span className="highlight">{filtered.length ? ((page - 1) * pageSize + 1) : 0}</span> to <span className="highlight">{Math.min(page * pageSize, filtered.length)}</span> of <span className="highlight">{filtered.length}</span> results
                </div>
                <div className="dt-pagination-controls">
                    <button
                        className="btn-icon btn-sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <HiChevronLeft size={20} />
                    </button>
                    <span className="dt-page-current">Page {page} of {totalPages}</span>
                    <button
                        className="btn-icon btn-sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        <HiChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
