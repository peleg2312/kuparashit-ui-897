import { useEffect, useMemo, useRef, useState } from 'react';
import { HiSearch, HiFilter, HiChevronLeft, HiChevronRight, HiChevronDown } from 'react-icons/hi';
import {
    applyTableTransforms,
    buildFilterOptions,
    getRowClusterKey,
    getRowId,
    getSelectedRowsByIds,
    getSelectionClusterKey,
    getStatusClass,
} from '../../utils/dataTableHandlers';
import Toast from '../Toast/Toast';
import './DataTable.css';

export default function DataTable({
    columns,
    data,
    loading = false,
    onRowClick,
    enableSelection = false,
    onSelectionChange,
    rowAction = null,
}) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selected, setSelected] = useState([]);
    const [pageSize, setPageSize] = useState(14);
    const [toastMessage, setToastMessage] = useState('');
    const toastTimerRef = useRef(null);

    useEffect(() => () => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    }, []);

    const filterOptions = useMemo(() => {
        return buildFilterOptions(columns, data);
    }, [columns, data]);

    const filtered = useMemo(() => {
        return applyTableTransforms({ data, search, columns, filters, sortBy, sortDir });
    }, [data, search, filters, sortBy, sortDir, columns]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pagedData = filtered.slice((page - 1) * pageSize, page * pageSize);
    const selectedClusterKey = getSelectionClusterKey(data, selected);
    const fallbackClusterKey = selectedClusterKey || getRowClusterKey(pagedData[0] || {});
    const selectablePageRows = fallbackClusterKey
        ? pagedData.filter((row) => getRowClusterKey(row) === fallbackClusterKey)
        : pagedData;

    // Selection Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const pageIds = selectablePageRows.map((row, idx) => getRowId(row, idx));
            const newSel = [...new Set([...selected, ...pageIds])];
            setSelected(newSel);
            onSelectionChange?.(
                newSel,
                getSelectedRowsByIds(filtered, newSel),
            );
        } else {
            const pageIds = new Set(selectablePageRows.map((row, idx) => getRowId(row, idx)));
            const newSel = selected.filter((id) => !pageIds.has(id));
            setSelected(newSel);
            onSelectionChange?.(
                newSel,
                getSelectedRowsByIds(filtered, newSel),
            );
        }
    };

    const handleSelectRow = (id) => {
        const row = filtered.find((item, idx) => getRowId(item, idx) === id)
            || data.find((item, idx) => getRowId(item, idx) === id);
        if (!row) return;

        setSelected(prev => {
            const alreadySelected = prev.includes(id);
            if (!alreadySelected && prev.length > 0) {
                const activeClusterKey = getSelectionClusterKey(data, prev);
                const nextClusterKey = getRowClusterKey(row);
                if (activeClusterKey && nextClusterKey !== activeClusterKey) {
                    return prev;
                }
            }

            const newSel = alreadySelected
                ? prev.filter(Pid => Pid !== id)
                : [...prev, id];
            onSelectionChange?.(
                newSel,
                getSelectedRowsByIds(filtered, newSel),
            );
            return newSel;
        });
    };

    const showBlockedSelectionToast = () => {
        setToastMessage('Cannot select this row. You can only select objects from the same cluster.');
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 2600);
    };

    const isAllSelected = selectablePageRows.length > 0
        && selectablePageRows.every((r, idx) => selected.includes(getRowId(r, idx)));
    const isIndeterminate = selectablePageRows.some((r, idx) => selected.includes(getRowId(r, idx)))
        && !isAllSelected;

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
                                {rowAction && <th className="dt-th dt-th-action">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (enableSelection ? 1 : 0) + (rowAction ? 1 : 0)} className="dt-empty">
                                        <div className="dt-empty-state">
                                            <div className="dt-empty-icon">?</div>
                                            <p>No results found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((row) => {
                                    const rowId = getRowId(row);
                                    const isSelected = selected.includes(rowId);
                                    const rowClusterKey = getRowClusterKey(row);
                                    const isSelectionBlocked = !!selectedClusterKey
                                        && !isSelected
                                        && rowClusterKey !== selectedClusterKey;
                                    return (
                                        <tr
                                            key={rowId}
                                            className={`dt-row ${isSelected ? 'dt-row--selected' : ''}`}
                                            onClick={() => {
                                                if (enableSelection) {
                                                    if (isSelectionBlocked) {
                                                        showBlockedSelectionToast();
                                                        return;
                                                    }
                                                    handleSelectRow(rowId);
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
                                                        onChange={() => {
                                                            if (isSelectionBlocked) {
                                                                showBlockedSelectionToast();
                                                                return;
                                                            }
                                                            handleSelectRow(rowId);
                                                        }}
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
                                            {rowAction && (
                                                <td className="dt-td dt-td-action" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className="btn-icon dt-row-action"
                                                        title={rowAction.title || 'Run Action'}
                                                        onClick={() => rowAction.onClick?.(row)}
                                                    >
                                                        {rowAction.icon}
                                                    </button>
                                                </td>
                                            )}
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
                    <span className="dt-pagination-meta">
                        <span className="dt-pagination-chip">Showing</span>
                        <span className="dt-pagination-chip dt-pagination-chip--value">
                            {filtered.length ? ((page - 1) * pageSize + 1) : 0}
                            {' - '}
                            {Math.min(page * pageSize, filtered.length)}
                        </span>
                        <span className="dt-pagination-chip">of</span>
                        <span className="dt-pagination-chip dt-pagination-chip--value">{filtered.length}</span>
                        <span className="dt-pagination-chip">results</span>
                    </span>
                </div>
                <div className="dt-pagination-controls">
                    <div className="dt-page-size">
                        <span>Rows</span>
                        <select
                            className="select-field select-sm dt-page-size-select"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[8, 14, 20, 50].map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
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
            <Toast message={toastMessage} type="error" onClose={() => setToastMessage('')} />
        </div>
    );
}
