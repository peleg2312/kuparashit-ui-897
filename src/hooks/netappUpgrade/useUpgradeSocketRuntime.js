import { useRef } from 'react';
import { usePersistentNetappSocket } from '../usePersistentNetappSocket';

/**
 * Handles websocket runtime behavior for NetApp upgrade flow.
 *
 * @param {object} params
 * @param {object} params.commands
 * @param {object} params.session
 * @param {object} params.terminal
 * @param {string} params.selectedMachine
 */
export function useUpgradeSocketRuntime({ commands, session, terminal, selectedMachine }) {
    const advanceAfterCommandRef = useRef('');
    const pendingCommandIdRef = useRef('');

    const markPendingCommandComplete = (status = 'done') => {
        const completedCommandId = pendingCommandIdRef.current;
        if (!completedCommandId) return;

        commands.actions.setCommandStatus(completedCommandId, status);
        pendingCommandIdRef.current = '';
    };

    const advanceIfNeeded = () => {
        if (!advanceAfterCommandRef.current) return;
        advanceAfterCommandRef.current = '';
        commands.actions.moveToNextCommand();
    };

    const handleSessionPayload = (payload) => {
        session.actions.setSessionInfo({
            connected: !!payload.connected,
            machine: payload.machine || '',
        });
        terminal.actions.appendTerminalLine(
            `[session] ${payload.message || 'Session updated.'}`,
            payload.connected ? 'success' : 'warning',
        );
    };

    const handleResponsePayload = (payload) => {
        const text = payload.output || payload.message || payload.raw || '';
        terminal.actions.appendTerminalLine(text, 'default');
        markPendingCommandComplete('done');
        advanceIfNeeded();
    };

    const handleLegacyCommandDonePayload = (payload) => {
        commands.actions.setCommandStatus(
            payload.commandId,
            payload.exitCode === 0 ? 'done' : 'error',
        );
        terminal.actions.appendTerminalLine(
            `[${payload.machine}] Completed with exit code ${payload.exitCode}.`,
            payload.exitCode === 0 ? 'success' : 'error',
        );

        if (advanceAfterCommandRef.current === payload.commandId) {
            advanceAfterCommandRef.current = '';
            commands.actions.moveToNextCommand();
        }
        pendingCommandIdRef.current = '';
    };

    const onSocketMessage = (payload) => {
        try {
            switch (payload?.type) {
                case 'hello':
                    terminal.actions.appendTerminalLine(`[ws] ${payload.message || 'Connection established.'}`, 'info');
                    break;
                case 'auth_ok':
                case 'session':
                    handleSessionPayload(payload);
                    break;
                case 'response':
                case 'message':
                    handleResponsePayload(payload);
                    break;
                // Backward compatibility with older websocket payload shape.
                case 'command_output':
                    terminal.actions.appendTerminalLine(payload.line || '', 'default');
                    break;
                case 'command_done':
                    handleLegacyCommandDonePayload(payload);
                    break;
                case 'error':
                    terminal.actions.appendTerminalLine(`[error] ${payload.message || 'Unexpected backend error.'}`, 'error');
                    break;
                default:
                    break;
            }
        } catch (error) {
            terminal.actions.appendTerminalLine(`[error] ${error?.message || 'Failed to process websocket payload.'}`, 'error');
        }
    };

    const socket = usePersistentNetappSocket(onSocketMessage);

    const connectSession = () => {
        if (!selectedMachine) {
            terminal.actions.appendTerminalLine('Please choose a NetApp machine before connecting.', 'warning');
            return;
        }
        const sent = socket.actions.connectSession({
            machine: selectedMachine,
            username: session.state.credentials.username,
            password: session.state.credentials.password,
        });
        if (!sent) {
            terminal.actions.appendTerminalLine('Websocket is not connected. Waiting for reconnect...', 'warning');
            return;
        }
        session.actions.setSessionInfo({ connected: true, machine: selectedMachine });
        terminal.actions.appendTerminalLine(`[session] Connected request sent for ${selectedMachine}.`, 'info');
    };

    const runNextCommand = () => {
        if (!commands.state.activeCommand) {
            terminal.actions.appendTerminalLine('No command selected.', 'warning');
            return;
        }
        if (!commands.state.activeCommand.command.trim()) {
            terminal.actions.appendTerminalLine('Active command is empty.', 'warning');
            return;
        }
        if (!selectedMachine) {
            terminal.actions.appendTerminalLine('Choose a NetApp machine before running commands.', 'warning');
            return;
        }
        if (!session.state.sessionInfo.connected) {
            terminal.actions.appendTerminalLine('Connect session first with username and password.', 'warning');
            return;
        }

        const sent = socket.actions.sendCommand(commands.state.activeCommand.command);

        if (!sent) {
            terminal.actions.appendTerminalLine('Websocket is not connected. Waiting for reconnect...', 'warning');
            return;
        }

        pendingCommandIdRef.current = commands.state.activeCommand.id;
        commands.actions.setCommandStatus(commands.state.activeCommand.id, 'running');
        advanceAfterCommandRef.current = commands.state.activeCommand.id;
    };

    return {
        state: {
            connectionState: socket.state.connectionState,
            isConnected: socket.state.isConnected,
        },
        actions: {
            connectSession,
            runNextCommand,
        },
    };
}
