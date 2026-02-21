import { useCallback, useState } from 'react';
import {
    getRowClusterKey,
    getRowId,
    getSelectedRowsByIds,
    getSelectionClusterKey,
} from '@/utils/dataTableHandlers';

function getSelectableRowsFromPage(pagedData, selectedClusterKey) {
    const fallbackClusterKey = selectedClusterKey || getRowClusterKey(pagedData[0] || {});
    if (!fallbackClusterKey) return pagedData;
    return pagedData.filter((row) => getRowClusterKey(row) === fallbackClusterKey);
}

export function useTableSelection({ data, filtered, pagedData, onSelectionChange }) {
    const [selected, setSelected] = useState([]);

    const selectedClusterKey = getSelectionClusterKey(data, selected);
    const selectablePageRows = getSelectableRowsFromPage(pagedData, selectedClusterKey);

    const applySelectionChange = useCallback((nextSelected) => {
        onSelectionChange?.(
            nextSelected,
            getSelectedRowsByIds(filtered, nextSelected),
        );
    }, [filtered, onSelectionChange]);

    const handleSelectAll = useCallback((checked) => {
        if (checked) {
            const pageIds = selectablePageRows.map((row, idx) => getRowId(row, idx));
            const nextSelected = [...new Set([...selected, ...pageIds])];
            setSelected(nextSelected);
            applySelectionChange(nextSelected);
            return;
        }

        const pageIds = new Set(selectablePageRows.map((row, idx) => getRowId(row, idx)));
        const nextSelected = selected.filter((id) => !pageIds.has(id));
        setSelected(nextSelected);
        applySelectionChange(nextSelected);
    }, [applySelectionChange, selectablePageRows, selected]);

    const handleSelectRow = useCallback((id) => {
        const row = filtered.find((item, idx) => getRowId(item, idx) === id)
            || data.find((item, idx) => getRowId(item, idx) === id);
        if (!row) return false;

        let changed = false;
        setSelected((prevSelected) => {
            const alreadySelected = prevSelected.includes(id);
            if (!alreadySelected && prevSelected.length > 0) {
                const activeClusterKey = getSelectionClusterKey(data, prevSelected);
                const nextClusterKey = getRowClusterKey(row);
                if (activeClusterKey && nextClusterKey !== activeClusterKey) {
                    return prevSelected;
                }
            }

            const nextSelected = alreadySelected
                ? prevSelected.filter((selectedId) => selectedId !== id)
                : [...prevSelected, id];

            changed = true;
            applySelectionChange(nextSelected);
            return nextSelected;
        });

        return changed;
    }, [applySelectionChange, data, filtered]);

    const isRowSelectionBlocked = useCallback((row) => {
        const rowId = getRowId(row);
        const isSelected = selected.includes(rowId);
        const rowClusterKey = getRowClusterKey(row);
        return !!selectedClusterKey
            && !isSelected
            && rowClusterKey !== selectedClusterKey;
    }, [selected, selectedClusterKey]);

    const isAllSelected = selectablePageRows.length > 0
        && selectablePageRows.every((row, idx) => selected.includes(getRowId(row, idx)));
    const isIndeterminate = selectablePageRows.some((row, idx) => selected.includes(getRowId(row, idx)))
        && !isAllSelected;

    return {
        state: {
            selected,
            selectedClusterKey,
            isAllSelected,
            isIndeterminate,
        },
        actions: {
            handleSelectAll,
            handleSelectRow,
            isRowSelectionBlocked,
        },
    };
}
