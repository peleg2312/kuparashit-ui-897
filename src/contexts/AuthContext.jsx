/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);
const SESSION_KEY = 'kupa_session_v2';

function saveSession(session) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            user: session.user,
            authMode: session.authMode,
            permissions: session.permissions,
        }),
    );
}

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.user?.id) return null;
        return parsed;
    } catch {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function normalizeAuthResponse(data, fallbackMode = 'local') {
    if (!data?.user) return null;
    const teams = data.user.teams || data.teams || [];
    return {
        user: { ...data.user, teams },
        authMode: data.authMode || fallbackMode,
        token: data.token || '',
        teams,
        permissions: data.permissions || [],
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState('local');
    const [permissions, setPermissions] = useState([]);
    const [token, setToken] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const applyAuthSession = (sessionData) => {
        setUser(sessionData.user);
        setAuthMode(sessionData.authMode);
        setPermissions(sessionData.permissions || []);
        setToken(sessionData.token || '');
        setIsAuthenticated(true);
        saveSession(sessionData);
    };

    useEffect(() => {
        let mounted = true;

        const bootstrap = async () => {
            try {
                const sessionFromCookie = await authApi.getSession();
                const normalized = normalizeAuthResponse(sessionFromCookie, 'cookie');

                if (normalized?.user && mounted) {
                    const permissionData = await authApi.getPermissions(normalized.teams);
                    applyAuthSession({
                        ...normalized,
                        user: { ...normalized.user, teams: permissionData.teams || normalized.teams },
                        permissions: permissionData.permissions || normalized.permissions,
                    });
                } else if (mounted) {
                    const stored = loadSession();
                    if (stored?.user) {
                        setUser(stored.user);
                        setAuthMode(stored.authMode || 'local');
                        setPermissions(stored.permissions || []);
                        setToken('');
                        setIsAuthenticated(true);
                    }
                }
            } catch {
                if (mounted) clearSession();
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        bootstrap();
        return () => {
            mounted = false;
        };
    }, []);

    const login = async (apiCall, fallbackMode) => {
        const response = await apiCall();
        const normalized = normalizeAuthResponse(response, fallbackMode);
        if (!normalized?.user) {
            throw new Error('Invalid auth response');
        }

        const permissionData = await authApi.getPermissions(normalized.teams);
        const finalSession = {
            ...normalized,
            user: { ...normalized.user, teams: permissionData.teams || normalized.teams },
            permissions: permissionData.permissions || normalized.permissions,
        };

        applyAuthSession(finalSession);
        return finalSession.user;
    };

    const loginLocal = async ({ username, password }) =>
        login(() => authApi.loginLocal({ username, password }), 'local');

    const loginAdfs = async () =>
        login(() => authApi.loginAdfs(), 'adfs');

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            setUser(null);
            setAuthMode('local');
            setPermissions([]);
            setToken('');
            setIsAuthenticated(false);
            clearSession();
        }
    };

    const value = {
        user,
        authMode,
        token,
        permissions,
        isAuthenticated,
        isLoading,
        loginLocal,
        loginAdfs,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
