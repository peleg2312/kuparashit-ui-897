import { HiChevronDown } from 'react-icons/hi';
import { getRowId, getStatusClass } from '../../utils/dataTableHandlers';

export default function DataTableGrid({
    columns,
    loading,
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
    return (
        <div className="dt-container">
            {loading ? (
                <div className="dt-loading">
                    {Array.from({ length: 6 }).map((_, rowIndex) => (
                        <div key={rowIndex} className="dt-skeleton-row">
                            <div className="skeleton dt-skeleton-check" />
                            {columns.map((_, columnIndex) => (
                                <div key={columnIndex} className="skeleton dt-skeleton-cell" />
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
