import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const PAGE_SIZE_OPTIONS = [8, 14, 20, 50];

export default function DataTablePagination({
    filteredLength,
    page,
    pageSize,
    totalPages,
    onPageChange,
    onPageSizeChange,
}) {
    return (
        <div className="dt-pagination">
            <div className="dt-pagination-info">
                <span className="dt-pagination-meta">
                    <span className="dt-pagination-chip">Showing</span>
                    <span className="dt-pagination-chip dt-pagination-chip--value">
                        {filteredLength ? ((page - 1) * pageSize + 1) : 0}
                        {' - '}
                        {Math.min(page * pageSize, filteredLength)}
                    </span>
                    <span className="dt-pagination-chip">of</span>
                    <span className="dt-pagination-chip dt-pagination-chip--value">{filteredLength}</span>
                    <span className="dt-pagination-chip">results</span>
                </span>
            </div>
            <div className="dt-pagination-controls">
                <div className="dt-page-size">
                    <span>Rows</span>
                    <select
                        className="select-field select-sm dt-page-size-select"
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
                <button
                    className="btn-icon btn-sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <HiChevronLeft size={20} />
                </button>
                <span className="dt-page-current">Page {page} of {totalPages}</span>
                <button
                    className="btn-icon btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <HiChevronRight size={20} />
                </button>
            </div>
        </div>
    );
}
