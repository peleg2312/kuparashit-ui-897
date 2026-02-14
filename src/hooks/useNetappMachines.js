import { useEffect, useRef, useState } from 'react';
import { mainApi } from '../api';
import { normalizeNetappMachine } from '../utils/netappMachineMeta';

export function useNetappMachines(onError) {
    const [machines, setMachines] = useState([]);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        let mounted = true;

        const loadMachines = async () => {
            try {
                const response = await mainApi.getNetappMachines();
                if (!mounted) return;
                const normalized = (response || []).map((item, index) => normalizeNetappMachine(item, index));
                setMachines(normalized);
            } catch (error) {
                if (!mounted) return;
                onErrorRef.current?.(`Failed to load NetApp machine list: ${error?.message || 'Unknown error'}`);
            }
        };

        loadMachines();
        return () => {
            mounted = false;
        };
    }, []);

    return machines;
}
