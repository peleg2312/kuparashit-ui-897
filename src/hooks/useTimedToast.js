import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimedToast(defaultDurationMs = 2400) {
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const timerRef = useRef(null);

    useEffect(() => () => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const hideToast = useCallback(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setToastMessage('');
    }, []);

    const showToast = useCallback((message, type = 'success', durationMs = defaultDurationMs) => {
        setToastMessage(message);
        setToastType(type);
        if (timerRef.current) window.clearTimeout(timerRef.current);

        if (durationMs > 0) {
            timerRef.current = window.setTimeout(() => {
                setToastMessage('');
                timerRef.current = null;
            }, durationMs);
        }
    }, [defaultDurationMs]);

    return {
        toastMessage,
        toastType,
        showToast,
        hideToast,
    };
}
