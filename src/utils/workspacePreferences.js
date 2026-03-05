const SELECTED_TEAM_KEY = 'kupa_workspace_selected_team_v1';
const LAST_PATHS_KEY = 'kupa_workspace_last_paths_v1';

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeParseObject(rawValue) {
    if (!rawValue) return {};
    try {
        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function isValidPath(path) {
    return typeof path === 'string' && path.startsWith('/');
}

export function loadPreferredTeamId() {
    if (!canUseStorage()) return null;
    const value = String(window.localStorage.getItem(SELECTED_TEAM_KEY) || '').trim();
    return value || null;
}

export function savePreferredTeamId(teamId) {
    if (!canUseStorage()) return;
    const value = String(teamId || '').trim();
    if (!value) return;
    window.localStorage.setItem(SELECTED_TEAM_KEY, value);
}

export function getLastPathForTeam(teamId) {
    if (!canUseStorage()) return '';
    const key = String(teamId || '').trim();
    if (!key) return '';
    const map = safeParseObject(window.localStorage.getItem(LAST_PATHS_KEY));
    const value = map[key];
    return isValidPath(value) ? value : '';
}

export function saveLastPathForTeam(teamId, path) {
    if (!canUseStorage()) return;
    const key = String(teamId || '').trim();
    if (!key || !isValidPath(path)) return;

    const map = safeParseObject(window.localStorage.getItem(LAST_PATHS_KEY));
    map[key] = path;
    window.localStorage.setItem(LAST_PATHS_KEY, JSON.stringify(map));
}
