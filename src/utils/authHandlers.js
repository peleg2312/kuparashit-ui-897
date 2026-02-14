const SESSION_KEY = 'kupa_session_v2';

export function saveSession(session) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            user: session.user,
            authMode: session.authMode,
            permissions: session.permissions,
        }),
    );
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export function normalizeAuthResponse(data, fallbackMode = 'local') {
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
