import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCsiWalletChecks } from '@/config/csiWalletsChecks';
import { useDropdownMenuState } from '@/hooks/actionModal/useDropdownMenuState';
import {
    buildSources,
    normalizePayload,
    refreshScopedStorageClasses,
} from '@/utils/csiWalletsUtils';

export function useCsiWalletsPageState() {
    const [options, setOptions] = useState({ openshifts: [], storageClasses: [], pflexServers: [] });
    const [values, setValues] = useState({ openshift: '', storageClass: '', pflexServer: '', sizeInTb: '' });
    const [sourceState, setSourceState] = useState({
        loading: true,
        refreshing: false,
        storageClassLoading: false,
        storageClassMode: 'pending',
        error: '',
    });
    const [selectedCheckKey, setSelectedCheckKey] = useState('ocp');
    const [activeCheckKey, setActiveCheckKey] = useState('');
    const [checkError, setCheckError] = useState('');
    const [lastResult, setLastResult] = useState(null);
    const scopedRef = useRef('');
    const {
        openDropdown,
        setOpenDropdown,
        registerDropdownRef,
    } = useDropdownMenuState();

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const bundle = await buildSources();
                if (cancelled) return;

                scopedRef.current = bundle.storageClassMode === 'scoped' ? bundle.selection.openshift : '';
                setOptions(bundle.options);
                setValues((prev) => ({ ...prev, ...bundle.selection }));
                setSourceState({
                    loading: false,
                    refreshing: false,
                    storageClassLoading: false,
                    storageClassMode: bundle.storageClassMode,
                    error: '',
                });
            } catch (error) {
                if (cancelled) return;
                setSourceState({
                    loading: false,
                    refreshing: false,
                    storageClassLoading: false,
                    storageClassMode: 'pending',
                    error: error?.message || 'Failed to load sources.',
                });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (sourceState.storageClassMode !== 'scoped' || !values.openshift || scopedRef.current === values.openshift) return;

        let cancelled = false;

        (async () => {
            setSourceState((prev) => ({ ...prev, storageClassLoading: true, error: '' }));
            try {
                const next = await refreshScopedStorageClasses(values.openshift, values.storageClass);
                if (cancelled) return;

                scopedRef.current = values.openshift;
                setOptions((prev) => ({ ...prev, storageClasses: next.options }));
                setValues((prev) => ({ ...prev, storageClass: next.selected }));
                setSourceState((prev) => ({ ...prev, storageClassLoading: false }));
            } catch (error) {
                if (cancelled) return;
                setSourceState((prev) => ({
                    ...prev,
                    storageClassLoading: false,
                    error: error?.message || 'Failed to refresh storage classes.',
                }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sourceState.storageClassMode, values.openshift, values.storageClass]);

    useEffect(() => {
        setOpenDropdown('');
    }, [selectedCheckKey, setOpenDropdown]);

    const checks = useMemo(() => buildCsiWalletChecks(values), [values]);
    const selectedCheck = checks.find((check) => check.key === selectedCheckKey) || checks[0];

    const updateValue = (fieldKey, nextValue) => {
        setValues((prev) => ({ ...prev, [fieldKey]: nextValue }));
    };

    const selectCheck = (checkKey) => {
        setSelectedCheckKey(checkKey);
    };

    const runCheck = async (check) => {
        if (!check || check.disabled || activeCheckKey) return;

        const snapshot = {
            checkKey: check.key,
            label: check.label,
            endpoint: check.endpoint,
            params: check.params,
            payload: null,
            receivedAt: '',
        };

        setCheckError('');
        setActiveCheckKey(check.key);
        setLastResult(snapshot);

        try {
            const response = await check.run();
            setLastResult({
                ...snapshot,
                payload: normalizePayload(response),
                receivedAt: new Date().toLocaleTimeString(),
            });
        } catch (error) {
            setCheckError(error?.message || 'CSI Wallets check failed.');
        } finally {
            setActiveCheckKey('');
        }
    };

    return {
        state: {
            options,
            values,
            sourceState,
            selectedCheckKey,
            selectedCheck,
            checks,
            activeCheckKey,
            checkError,
            lastResult,
        },
        actions: {
            updateValue,
            selectCheck,
            runCheck,
        },
        dropdown: {
            openDropdown,
            setOpenDropdown,
            registerDropdownRef,
        },
    };
}
