import { useMemo, useState } from 'react';
import { createNewCommand, INITIAL_COMMANDS, updateCommandStatus } from '@/config/netappUpgrade';

export function useUpgradeCommands() {
    const [commands, setCommands] = useState(() => INITIAL_COMMANDS);
    const [activeCommandId, setActiveCommandId] = useState(() => INITIAL_COMMANDS[0]?.id || '');

    const activeCommand = useMemo(
        () => commands.find((command) => command.id === activeCommandId) || null,
        [commands, activeCommandId],
    );

    const activeCommandIndex = useMemo(
        () => commands.findIndex((command) => command.id === activeCommandId),
        [commands, activeCommandId],
    );

    const moveToNextCommand = () => {
        if (!commands.length) return;
        if (activeCommandIndex < 0) {
            setActiveCommandId(commands[0].id);
            return;
        }
        const nextIndex = activeCommandIndex + 1;
        if (nextIndex < commands.length) {
            setActiveCommandId(commands[nextIndex].id);
        }
    };

    const setCommandStatus = (commandId, status) => {
        setCommands((prev) => updateCommandStatus(prev, commandId, status));
    };

    const updateCommand = (commandId, value) => {
        setCommands((prev) =>
            prev.map((command) =>
                command.id === commandId ? { ...command, command: value, status: 'idle' } : command,
            ),
        );
    };

    const removeCommand = (commandId) => {
        const nextCommands = commands.filter((command) => command.id !== commandId);
        setCommands(nextCommands);
        if (activeCommandId === commandId) {
            setActiveCommandId(nextCommands[0]?.id || '');
        }
    };

    const addCommand = () => {
        const nextCommands = [...commands, createNewCommand(commands.length)];
        setCommands(nextCommands);
        if (!activeCommandId) {
            setActiveCommandId(nextCommands[0]?.id || '');
        }
    };

    return {
        state: {
            commands,
            activeCommandId,
            activeCommand,
        },
        actions: {
            setActiveCommandId,
            moveToNextCommand,
            setCommandStatus,
            updateCommand,
            removeCommand,
            addCommand,
        },
    };
}
