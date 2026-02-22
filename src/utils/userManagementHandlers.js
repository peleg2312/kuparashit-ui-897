export const DEFAULT_GROUP_FORM = {
    group: '',
    permissions: [],
};

export const DEFAULT_USER_FORM = {
    username: '',
    password: '',
    permissions: [],
    type: 'local',
};

export function toggleValue(list, value) {
    if (list.includes(value)) {
        return list.filter((item) => item !== value);
    }
    return [...list, value];
}

export function getGroupId(group) {
    return String(group?._id || group?.id || group?.group || group?.name || '').trim();
}

export function getGroupName(group) {
    return String(group?.group || group?.name || group?._id || group?.id || '').trim();
}

export function getGroupPermissions(group) {
    if (Array.isArray(group?.permissions)) {
        return group.permissions.map((item) => String(item));
    }
    if (Array.isArray(group?.permissionKeys)) {
        return group.permissionKeys.map((item) => String(item));
    }
    return [];
}

export function getUserId(user) {
    return String(user?._id || user?.id || user?.username || '').trim();
}

export function getUserPermissions(user) {
    if (Array.isArray(user?.permissions)) {
        return user.permissions.map((item) => String(item));
    }
    if (Array.isArray(user?.permissionKeys)) {
        return user.permissionKeys.map((item) => String(item));
    }
    if (Array.isArray(user?.teams)) {
        return user.teams.map((item) => String(item));
    }
    return [];
}

export function getUserType(user) {
    const normalized = String(user?.type || '').trim().toLowerCase();
    if (normalized === 'adfs') return 'adfs';
    return 'local';
}
