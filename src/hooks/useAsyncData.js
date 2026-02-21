import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight async data hook for server state without adding external libs.
 * It handles loading/error/data lifecycle and guards against stale responses.
 *
 * @template T
 * @param {() => Promise<T>} fetcher
 * @param {object} [options]
 * @param {T} [options.initialData]
 * @param {boolean} [options.enabled=true]
 * @param {Array<unknown>} [options.deps=[]]
 * @returns {{
 *   data: T,
 *   loading: boolean,
 *   error: Error | null,
 *   reload: () => Promise<T | undefined>,
 *   setData: React.Dispatch<React.SetStateAction<T>>,
 * }}
 */
export function useAsyncData(fetcher, options = {}) {
    const {
        initialData = null,
        enabled = true,
        deps = [],
    } = options;

    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(Boolean(enabled));
    const [error, setError] = useState(null);
    const runIdRef = useRef(0);

    const reload = useCallback(async () => {
        const runId = runIdRef.current + 1;
        runIdRef.current = runId;

        setLoading(true);
        setError(null);

        try {
            const result = await fetcher();
            if (runId !== runIdRef.current) return undefined;
            setData(result);
            return result;
        } catch (nextError) {
            if (runId !== runIdRef.current) return undefined;
            setError(nextError);
            return undefined;
        } finally {
            if (runId === runIdRef.current) {
                setLoading(false);
            }
        }
    }, [fetcher]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, reload, ...deps]);

    return {
        data,
        loading,
        error,
        reload,
        setData,
    };
}
