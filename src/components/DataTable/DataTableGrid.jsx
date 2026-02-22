import { HiChevronDown } from 'react-icons/hi';
import { getRowId, getStatusClass } from '../../utils/dataTableHandlers';

export default function DataTableGrid({
    columns,
    loading,
    skeletonRowCount = 14,
    enableSelection,
    rowAction,
    pagedData,
    sortBy,
    sortDir,
    selected,
    isAllSelected,
    isIndeterminate,
    onSort,
    onSelectAll,
    onSelectRow,
    isRowSelectionBlocked,
    onBlockedSelection,
    onRowClick,
}) {
    const loadingRows = Array.from({ length: Math.max(6, skeletonRowCount) });

    return (
        <div className="dt-container">
            {loading ? (
                <div className="dt-loading" role="status" aria-live="polite" aria-label="Loading table data">
                    <table className="dt-table dt-table--skeleton" aria-hidden="true">
                        <thead>
                            <tr>
                                {enableSelection && (
                                    <th className="dt-th dt-th-check">
                                        <span className="skeleton dt-skeleton-block dt-skeleton-block--check" />
                                    </th>
                                )}
                                {columns.map((column) => (
                                    <th key={column.key} className="dt-th" style={{ width: column.width }}>
                                        <span className="skeleton dt-skeleton-block dt-skeleton-block--head" />
                                    </th>
                                ))}
                                {rowAction && (
                                    <th className="dt-th dt-th-action">
                                        <span className="skeleton dt-skeleton-block dt-skeleton-block--head dt-skeleton-block--action" />
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loadingRows.map((_, rowIndex) => (
                                <tr key={rowIndex} className="dt-skeleton-tr">
                                    {enableSelection && (
                                        <td className="dt-td dt-td-check">
                                            <span className="skeleton dt-skeleton-block dt-skeleton-block--check" />
                                        </td>
                                    )}
                                    {columns.map((column) => (
                                        <td key={`${column.key}-${rowIndex}`} className="dt-td">
                                            <span className="skeleton dt-skeleton-block dt-skeleton-block--cell" />
                                        </td>
                                    ))}
                                    {rowAction && (
                                        <td className="dt-td dt-td-action">
                                            <span className="skeleton dt-skeleton-block dt-skeleton-block--action" />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                                        ref={(input) => {
                                            if (input) input.indeterminate = isIndeterminate;
                                        }}
                                        onChange={(event) => onSelectAll(event.target.checked)}
                                    />
                                </th>
                            )}
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`dt-th ${column.sortable !== false ? 'dt-th--sortable' : ''}`}
                                    onClick={() => column.sortable !== false && onSort(column.key)}
                                    style={{ width: column.width }}
                                >
                                    <div className="dt-th-content">
                                        <span>{column.label}</span>
                                        {sortBy === column.key && (
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
                                const blockedSelection = isRowSelectionBlocked(row);

                                return (
                                    <tr
                                        key={rowId}
                                        className={`dt-row ${isSelected ? 'dt-row--selected' : ''}`}
                                        onClick={() => {
                                            if (enableSelection) {
                                                if (blockedSelection) {
                                                    onBlockedSelection();
                                                    return;
                                                }
                                                onSelectRow(rowId);
                                                return;
                                            }
                                            onRowClick?.(row);
                                        }}
                                    >
                                        {enableSelection && (
                                            <td className="dt-td dt-td-check" onClick={(event) => event.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (blockedSelection) {
                                                            onBlockedSelection();
                                                            return;
                                                        }
                                                        onSelectRow(rowId);
                                                    }}
                                                />
                                            </td>
                                        )}
                                        {columns.map((column) => (
                                            <td key={column.key} className="dt-td">
                                                {column.key === 'status' ? (
                                                    <span className={`badge ${getStatusClass(row[column.key])}`}>{row[column.key]}</span>
                                                ) : column.render ? (
                                                    column.render(row[column.key], row)
                                                ) : (
                                                    row[column.key]
                                                )}
                                            </td>
                                        ))}
                                        {rowAction && (
                                            <td className="dt-td dt-td-action" onClick={(event) => event.stopPropagation()}>
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
    );
}
