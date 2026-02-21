import { useEffect, useRef, useState } from 'react';
import { loadDropdownOptions } from '../../utils/actionModal/dropdownOptions';

/**
 * Fetch dropdown-api options for visible action params.
 * Uses a short debounce and keeps previous successful options on transient failures.
 *
 * @param {object} params
 * @param {object} params.action
 * @param {string} params.dropdownDependencyKey
 * @param {object} params.values
 * @returns {object}
 */
export function useActionDropdownOptions({ action, dropdownDependencyKey, values }) {
    const [dropdownOptions, setDropdownOptions] = useState({});
    const latestValuesRef = useRef(values);

    useEffect(() => {
        latestValuesRef.current = values;
    }, [values]);

    useEffect(() => {
        if (!action) return undefined;

        let cancelled = false;
        const timerId = window.setTimeout(async () => {
            try {
                const loadedOptions = await loadDropdownOptions(action, latestValuesRef.current);
                if (cancelled) return;
                setDropdownOptions((prev) => ({ ...prev, ...loadedOptions }));
            } catch {
                // Keep previously loaded options if one request fails.
            }
        }, 120);

        return () => {
            cancelled = true;
            window.clearTimeout(timerId);
        };
    }, [action, dropdownDependencyKey]);

    return {
        dropdownOptions,
        setDropdownOptions,
    };
}
