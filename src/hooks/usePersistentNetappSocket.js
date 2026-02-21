import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_CONFIG } from '../api/client';

const RECONNECT_DELAY_MS = 1500;
const DEFAULT_WS_PATH = '/ws/ssh';

function resolveWebSocketUrl(path) {
    const base = new URL(API_CONFIG.mainBaseUrl);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = path;
    base.search = '';
    base.hash = '';
    return base.toString();
}

export function usePersistentNetappSocket(onMessage, wsPath = DEFAULT_WS_PATH) {
    const socketRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const onMessageRef = useRef(onMessage);
    const shouldReconnectRef = useRef(true);
    const [connectionState, setConnectionState] = useState('connecting');
    const socketUrl = useMemo(() => resolveWebSocketUrl(wsPath), [wsPath]);

    const emitMessage = useCallback((payload) => {
        try {
            onMessageRef.current?.(payload);
        } catch {
            // Keep websocket loop alive even if consumer handler fails.
        }
    }, []);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        shouldReconnectRef.current = true;

        const connect = () => {
            if (!shouldReconnectRef.current) return;
            setConnectionState((state) => (state === 'open' ? state : 'connecting'));
            const socket = new WebSocket(socketUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                setConnectionState('open');
            };

            socket.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    emitMessage(parsed);
                } catch {
                    emitMessage({
                        type: 'response',
                        output: String(event.data || ''),
                    });
                }
            };

            socket.onerror = () => {
                setConnectionState('error');
                emitMessage({
                    type: 'error',
                    message: 'Websocket transport error.',
                });
            };

            socket.onclose = () => {
                socketRef.current = null;
                if (!shouldReconnectRef.current) {
                    setConnectionState('closed');
                    return;
                }
                setConnectionState('reconnecting');
                reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
            };
        };

        connect();

        return () => {
            shouldReconnectRef.current = false;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [socketUrl, emitMessage]);

    const sendMessage = useCallback((payload) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }
        try {
            if (typeof payload === 'string') {
                socket.send(payload);
            } else {
                socket.send(JSON.stringify(payload));
            }
        } catch {
            emitMessage({
                type: 'error',
                message: 'Failed to send websocket message.',
            });
            return false;
        }
        return true;
    }, [emitMessage]);

    const connectSession = useCallback((credentials) => (
        sendMessage(JSON.stringify({
            host: credentials?.machine || credentials?.host || '',
            username: credentials?.username || '',
            password: credentials?.password || '',
        }))
    ), [sendMessage]);

    const sendCommand = useCallback((command) => (
        sendMessage(String(command || '').trim())
    ), [sendMessage]);

    return {
        state: {
            connectionState,
            isConnected: connectionState === 'open',
            socketUrl,
        },
        actions: {
            sendMessage,
            connectSession,
            sendCommand,
        },
    };
}
