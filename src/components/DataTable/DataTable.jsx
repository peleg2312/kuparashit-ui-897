import { useDataTableState } from '../../hooks/useDataTableState';
import { useTimedToast } from '../../hooks/useTimedToast';
import Toast from '../Toast/Toast';
import DataTableFilters from './DataTableFilters';
import DataTableGrid from './DataTableGrid';
import DataTablePagination from './DataTablePagination';
import DataTableToolbar from './DataTableToolbar';
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
    const { state, derived, actions } = useDataTableState({
        columns,
        data,
        onSelectionChange,
    });

    const { toastMessage, toastType, showToast, hideToast } = useTimedToast(2600);

    const showBlockedSelectionToast = () => {
        showToast('Cannot select this row. You can only select objects from the same cluster.', 'error', 2600);
    };

    return (
        <div className="data-table-wrapper">
            <DataTableToolbar
                columns={columns}
                search={state.search}
                onSearchChange={actions.handleSearchChange}
                showFilters={state.showFilters}
                onToggleFilters={actions.setShowFilters}
                activeFilterCount={derived.activeFilterCount}
            />

            {state.showFilters && (
                <DataTableFilters
                    columns={columns}
                    filters={state.filters}
                    filterOptions={derived.filterOptions}
                    activeFilterCount={derived.activeFilterCount}
                    onFilterChange={actions.handleFilterChange}
                    onClearFilters={actions.clearFilters}
                />
            )}

            <DataTableGrid
                columns={columns}
                loading={loading}
                skeletonRowCount={state.pageSize}
                enableSelection={enableSelection}
                rowAction={rowAction}
                pagedData={derived.pagedData}
                sortBy={state.sortBy}
                sortDir={state.sortDir}
                selected={derived.selected}
                isAllSelected={derived.isAllSelected}
                isIndeterminate={derived.isIndeterminate}
                onSort={actions.handleSort}
                onSelectAll={actions.handleSelectAll}
                onSelectRow={actions.handleSelectRow}
                isRowSelectionBlocked={actions.isRowSelectionBlocked}
                onBlockedSelection={showBlockedSelectionToast}
                onRowClick={onRowClick}
            />

            <DataTablePagination
                filteredLength={derived.filtered.length}
                page={state.page}
                pageSize={state.pageSize}
                totalPages={derived.totalPages}
                onPageChange={actions.setPage}
                onPageSizeChange={actions.handlePageSizeChange}
            />
            <Toast message={toastMessage} type={toastType} onClose={hideToast} />
        </div>
    );
}
