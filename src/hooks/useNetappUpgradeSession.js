import { useNetappMachines } from './useNetappMachines';
import { useUpgradeCommands } from './netappUpgrade/useUpgradeCommands';
import { useUpgradeSessionState } from './netappUpgrade/useUpgradeSessionState';
import { useUpgradeSocketRuntime } from './netappUpgrade/useUpgradeSocketRuntime';
import { useUpgradeTerminal } from './netappUpgrade/useUpgradeTerminal';

/**
 * Compose NetApp upgrade feature state from focused hooks.
 */
export function useNetappUpgradeSession() {
    const commands = useUpgradeCommands();
    const session = useUpgradeSessionState();
    const terminal = useUpgradeTerminal();

    const machines = useNetappMachines((errorMessage) => terminal.actions.appendTerminalLine(errorMessage, 'error'));
    const selectedMachine = session.state.credentials.machine || machines[0]?.name || '';

    const socket = useUpgradeSocketRuntime({
        commands,
        session,
        terminal,
        selectedMachine,
    });

    return {
        data: {
            commands: commands.state.commands,
            activeCommandId: commands.state.activeCommandId,
            terminalLines: terminal.state.terminalLines,
            credentials: session.state.credentials,
            sessionInfo: session.state.sessionInfo,
            machines,
            selectedMachine,
            connectionState: socket.state.connectionState,
            isConnected: socket.state.isConnected,
        },
        actions: {
            setActiveCommandId: commands.actions.setActiveCommandId,
            setCredentialField: session.actions.setCredentialField,
            updateCommand: commands.actions.updateCommand,
            removeCommand: commands.actions.removeCommand,
            addCommand: commands.actions.addCommand,
            connectSession: socket.actions.connectSession,
            runNextCommand: socket.actions.runNextCommand,
            moveToNextCommand: commands.actions.moveToNextCommand,
            clearTerminalLines: terminal.actions.clearTerminalLines,
        },
    };
}
