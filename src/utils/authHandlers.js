const SESSION_KEY = 'kupa_session_v2';

export function saveSession(session) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            user: session.user,
            authMode: session.authMode,
            permissions: session.permissions,
            token: session.token || '',
        }),
    );
}

export function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}
