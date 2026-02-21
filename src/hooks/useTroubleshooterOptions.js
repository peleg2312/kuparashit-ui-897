import { useCallback, useMemo } from 'react';
import { mainApi } from '@/api';
import { normalizeNetappMachine } from '@/utils/netappMachineMeta';
import { useAsyncData } from './useAsyncData';

/**
 * Fetches and normalizes vCenter + NetApp option lists for Troubleshooter modes.
 */
export function useTroubleshooterOptions() {
    const fetchOptions = useCallback(async () => {
        const [vcenters, netapps] = await Promise.all([
            mainApi.getVCenters(),
            mainApi.getNetappMachines(),
        ]);

        const vcOptions = Array.isArray(vcenters)
            ? vcenters.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

        const netappOptions = Array.isArray(netapps)
            ? netapps.map((item, index) => normalizeNetappMachine(item, index).name).filter(Boolean)
            : [];

        return {
            vcOptions,
            netappOptions,
        };
    }, []);

    const { data, loading, error } = useAsyncData(fetchOptions, {
        initialData: {
            vcOptions: [],
            netappOptions: [],
        },
        deps: [],
    });

    return useMemo(() => ({
        vcOptions: data?.vcOptions || [],
        netappOptions: data?.netappOptions || [],
        loadingOptions: loading,
        optionsError: error?.message || '',
    }), [data, error?.message, loading]);
}
