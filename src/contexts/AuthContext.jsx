/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import teams, { resolveTeamId } from '../config/teams';
import { authApi } from '../api';
import { clearSession, loadSession, saveSession } from '../utils/authHandlers';

const AuthContext = createContext(null);

function parsePermissionPayload(payload) {
    const parsed = {
        map: {},
        permissions: [],
        teams: [],
    };

    if (Array.isArray(payload)) {
        parsed.permissions = payload.map((item) => String(item));
        return parsed;
    }

    if (!payload || typeof payload !== 'object') {
        return parsed;
    }

    if (Array.isArray(payload.teams)) {
        parsed.teams = payload.teams.map((team) => String(team));
    }

    if (Array.isArray(payload.permissions)) {
        parsed.permissions = payload.permissions.map((permission) => String(permission));
        return parsed;
    }

    const mapCandidate = (
        payload.permissions && typeof payload.permissions === 'object' && !Array.isArray(payload.permissions)
            ? payload.permissions
            : (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
                ? payload.data
                : payload)
    );

    if (mapCandidate && typeof mapCandidate === 'object' && !Array.isArray(mapCandidate)) {
        const values = Object.values(mapCandidate);
        const isBooleanMap = values.length > 0 && values.every((value) => typeof value === 'boolean');
        if (isBooleanMap) {
            parsed.map = mapCandidate;
            parsed.permissions = Object.entries(mapCandidate)
                .filter(([, enabled]) => !!enabled)
                .map(([name]) => String(name));
            return parsed;
        }
    }

    return parsed;
}

function buildPermissionTeams(permissionMap, fallbackTeams = []) {
    const permissionKeys = Object.entries(permissionMap || {})
        .filter(([, enabled]) => !!enabled)
        .map(([name]) => String(name));

    const knownTeamIds = new Set(Object.keys(teams));
    const mappedTeams = permissionKeys
        .map((name) => resolveTeamId(name))
        .filter((teamId) => knownTeamIds.has(teamId));
    if (mappedTeams.length) return mappedTeams;

    if (Array.isArray(fallbackTeams) && fallbackTeams.length) {
        const filteredFallback = fallbackTeams
            .map((team) => resolveTeamId(team))
            .filter((team) => knownTeamIds.has(team));
        if (filteredFallback.length) return filteredFallback;
    }

    return [];
}

function buildSessionFromToken({ token, username, authMode, parsedPermissions, fallbackTeams = [] }) {
    const userTeams = buildPermissionTeams(parsedPermissions.map, [...(parsedPermissions.teams || []), ...fallbackTeams]);
    const safeUsername = String(username || 'user').trim() || 'user';

    return {
        token,
        authMode: authMode || 'local',
        permissions: parsedPermissions.permissions || [],
        user: {
            id: safeUsername,
            name: safeUsername,
            teams: userTeams,
        },
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
        setAuthMode(sessionData.authMode || 'local');
        setPermissions(sessionData.permissions || []);
        setToken(sessionData.token || '');
        setIsAuthenticated(true);
        saveSession(sessionData);
    };

    const clearAuthState = () => {
        setUser(null);
        setAuthMode('local');
        setPermissions([]);
        setToken('');
        setIsAuthenticated(false);
        clearSession();
    };

    useEffect(() => {
        let mounted = true;

        const bootstrap = async () => {
            try {
                const stored = loadSession();
                const storedToken = String(stored?.token || '').trim();
                if (!storedToken) {
                    if (mounted) clearAuthState();
                    return;
                }

                const permissionPayload = await authApi.getPermissions(storedToken);
                const parsedPermissions = parsePermissionPayload(permissionPayload);
                if (!mounted) return;

                const restoredSession = buildSessionFromToken({
                    token: storedToken,
                    username: stored?.user?.name || stored?.user?.id || 'user',
                    authMode: stored?.authMode || 'local',
                    parsedPermissions,
                    fallbackTeams: stored?.user?.teams || [],
                });

                if (restoredSession.user?.teams?.length || restoredSession.permissions?.length) {
                    applyAuthSession(restoredSession);
                    return;
                }

                clearAuthState();
            } catch {
                if (mounted) clearAuthState();
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        bootstrap();
        return () => {
            mounted = false;
        };
    }, []);

    const login = async (apiCall, fallbackMode, usernameHint) => {
        const loginResponse = await apiCall();
        const nextToken = String(loginResponse?.token || '').trim();

        if (nextToken) {
            const permissionPayload = await authApi.getPermissions(nextToken);
            const parsedPermissions = parsePermissionPayload(permissionPayload);
            const nextSession = buildSessionFromToken({
                token: nextToken,
                username: usernameHint,
                authMode: fallbackMode,
                parsedPermissions,
            });

            if (!nextSession.user?.teams?.length && !nextSession.permissions?.length) {
                throw new Error('No permissions returned by auth_check');
            }

            applyAuthSession(nextSession);
            return nextSession.user;
        }

        throw new Error('Invalid auth response: token is missing');
    };

    const loginLocal = async ({ username, password }) => (
        login(() => authApi.loginLocal({ username, password }), 'local', username)
    );

    const loginAdfs = async () => (
        login(() => authApi.loginAdfs({ username: 'adfs-user' }), 'adfs', 'ADFS User')
    );

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Clear local state even if backend logout fails.
        } finally {
            clearAuthState();
        }
    };

    const isAdmin = permissions.some((permission) => String(permission || '').trim().toLowerCase() === 'isadmin');

    const value = {
        user,
        authMode,
        token,
        permissions,
        isAdmin,
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
