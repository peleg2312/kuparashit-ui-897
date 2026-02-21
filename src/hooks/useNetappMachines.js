import { useCallback, useEffect, useMemo, useRef } from 'react';
import { mainApi } from '../api';
import { normalizeNetappMachine } from '../utils/netappMachineMeta';
import { useAsyncData } from './useAsyncData';

/**
 * Server-state hook for NetApp machine list.
 *
 * @param {(message: string) => void} [onError]
 * @returns {Array<{id: string, name: string}>}
 */
export function useNetappMachines(onError) {
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const fetchMachines = useCallback(async () => {
        const response = await mainApi.getNetappMachines();
        return (response || []).map((item, index) => normalizeNetappMachine(item, index));
    }, []);

    const { data, error } = useAsyncData(fetchMachines, {
        initialData: [],
        deps: [],
    });

    useEffect(() => {
        if (!error) return;
        onErrorRef.current?.(`Failed to load NetApp machine list: ${error?.message || 'Unknown error'}`);
    }, [error]);

    return useMemo(() => (Array.isArray(data) ? data : []), [data]);
}
