import { useEffect, useState } from 'react';

/**
 * Returns elapsed milliseconds while `running` is true.
 *
 * @param {boolean} running
 * @returns {number}
 */
export function useElapsedTimer(running) {
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!running) return undefined;

        const startedAt = Date.now();
        const resetTimerId = window.setTimeout(() => {
            setElapsedMs(0);
        }, 0);

        const timerId = window.setInterval(() => {
            setElapsedMs(Date.now() - startedAt);
        }, 120);

        return () => {
            window.clearTimeout(resetTimerId);
            window.clearInterval(timerId);
        };
    }, [running]);

    return running ? elapsedMs : 0;
}
