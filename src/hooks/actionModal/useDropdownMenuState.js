import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manage dropdown open/close, search input, outside-click close,
 * and fixed-position menu layout calculation for ActionModal selects.
 */
export function useDropdownMenuState() {
    const [openDropdown, setOpenDropdown] = useState('');
    const [searchByField, setSearchByField] = useState({});
    const [menuLayoutByField, setMenuLayoutByField] = useState({});
    const dropdownRefs = useRef({});

    const registerDropdownRef = useCallback((fieldName, node) => {
        if (node) {
            dropdownRefs.current[fieldName] = node;
            return;
        }
        delete dropdownRefs.current[fieldName];
    }, []);

    const setSearchValue = useCallback((fieldName, value) => {
        setSearchByField((prev) => ({ ...prev, [fieldName]: value }));
    }, []);

    const resetDropdownUiState = useCallback(() => {
        setOpenDropdown('');
        setSearchByField({});
        setMenuLayoutByField({});
    }, []);

    useEffect(() => {
        if (!openDropdown) return undefined;

        const handleOutsideClick = (event) => {
            const container = dropdownRefs.current[openDropdown];
            if (container && !container.contains(event.target)) {
                setOpenDropdown('');
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [openDropdown]);

    useEffect(() => {
        if (!openDropdown) return undefined;

        const updateLayout = () => {
            const container = dropdownRefs.current[openDropdown];
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const viewportPadding = 10;
            const maxPreferredHeight = Math.min(380, Math.floor(window.innerHeight * 0.5));
            const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
            const spaceAbove = rect.top - viewportPadding;
            const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(
                180,
                Math.min(maxPreferredHeight, Math.max(spaceBelow, spaceAbove)),
            );
            const left = Math.max(
                viewportPadding,
                Math.min(rect.left, window.innerWidth - viewportPadding - rect.width),
            );
            const top = openUp
                ? Math.max(viewportPadding, rect.top - maxHeight - 8)
                : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + 8);

            setMenuLayoutByField((prev) => ({
                ...prev,
                [openDropdown]: {
                    top,
                    left,
                    width: rect.width,
                    maxHeight,
                },
            }));
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('scroll', updateLayout, true);
        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('scroll', updateLayout, true);
        };
    }, [openDropdown]);

    return {
        openDropdown,
        searchByField,
        menuLayoutByField,
        setOpenDropdown,
        setSearchValue,
        registerDropdownRef,
        resetDropdownUiState,
    };
}
