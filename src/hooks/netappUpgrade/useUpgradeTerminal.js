import { useState } from 'react';
import { createTerminalLine } from '@/utils/netappTerminal';

export function useUpgradeTerminal() {
    const [terminalLines, setTerminalLines] = useState([]);

    const appendTerminalLine = (text, tone = 'default') => (
        setTerminalLines((prev) => [...prev, createTerminalLine(text, tone)])
    );

    return {
        state: {
            terminalLines,
        },
        actions: {
            appendTerminalLine,
            clearTerminalLines: () => setTerminalLines([]),
        },
    };
}
