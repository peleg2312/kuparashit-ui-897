export default function DataTableFilters({
    columns,
    filters,
    filterOptions,
    activeFilterCount,
    onFilterChange,
    onClearFilters,
}) {
    return (
        <div className="dt-filters animate-slide-down">
            {columns.filter((column) => column.filterable).map((column) => (
                <div key={column.key} className="dt-filter-group">
                    <label className="dt-filter-label">{column.label}</label>
                    <div className="select-wrapper">
                        <select
                            className="select-field select-sm"
                            value={filters[column.key] || '__all__'}
                            onChange={(event) => onFilterChange(column.key, event.target.value)}
                        >
                            <option value="__all__">All</option>
                            {(filterOptions[column.key] || []).map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ))}
            {activeFilterCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={onClearFilters}>
                    Clear All
                </button>
            )}
        </div>
    );
}
