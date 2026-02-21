import { HiFilter, HiSearch } from 'react-icons/hi';

export default function DataTableToolbar({
    columns,
    search,
    onSearchChange,
    showFilters,
    onToggleFilters,
    activeFilterCount,
}) {
    return (
        <div className="dt-toolbar">
            <div className="dt-search">
                <HiSearch size={20} className="dt-search-icon" />
                <input
                    className="dt-search-input"
                    placeholder="Search across all columns..."
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </div>
            <div className="dt-toolbar-actions">
                {columns.some((column) => column.filterable) && (
                    <button
                        className={`btn btn-secondary btn-sm ${activeFilterCount > 0 ? 'btn--active-filter' : ''}`}
                        onClick={() => onToggleFilters(!showFilters)}
                    >
                        <HiFilter size={18} />
                        Filters
                        {activeFilterCount > 0 && <span className="dt-filter-badge">{activeFilterCount}</span>}
                    </button>
                )}
            </div>
        </div>
    );
}
