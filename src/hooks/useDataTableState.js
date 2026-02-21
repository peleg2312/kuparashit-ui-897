import { useCallback, useMemo, useState } from 'react';
import { applyTableTransforms, buildFilterOptions } from '../utils/dataTableHandlers';
import { useTableSelection } from './dataTable/useTableSelection';

export function useDataTableState({ columns, data, onSelectionChange }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [pageSize, setPageSize] = useState(14);

    const filterOptions = useMemo(
        () => buildFilterOptions(columns, data),
        [columns, data],
    );

    const filtered = useMemo(
        () => applyTableTransforms({ data, search, columns, filters, sortBy, sortDir }),
        [data, search, columns, filters, sortBy, sortDir],
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pagedData = filtered.slice((page - 1) * pageSize, page * pageSize);

    const selection = useTableSelection({
        data,
        filtered,
        pagedData,
        onSelectionChange,
    });

    const activeFilterCount = Object.values(filters).filter((value) => value && value !== '__all__').length;

    const handleSearchChange = useCallback((value) => {
        setSearch(value);
        setPage(1);
    }, []);

    const handleSort = useCallback((key) => {
        if (sortBy === key) {
            setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortBy(key);
        setSortDir('asc');
    }, [sortBy]);

    const handleFilterChange = useCallback((key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({});
        setPage(1);
    }, []);

    const handlePageSizeChange = useCallback((value) => {
        setPageSize(value);
        setPage(1);
    }, []);

    return {
        state: {
            search,
            sortBy,
            sortDir,
            filters,
            page,
            showFilters,
            pageSize,
        },
        derived: {
            filterOptions,
            filtered,
            totalPages,
            pagedData,
            activeFilterCount,
            ...selection.state,
        },
        actions: {
            handleSearchChange,
            handleSort,
            handleFilterChange,
            clearFilters,
            setPage,
            setShowFilters,
            handlePageSizeChange,
            ...selection.actions,
        },
    };
}
