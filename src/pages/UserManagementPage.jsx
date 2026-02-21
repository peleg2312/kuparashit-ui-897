import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    HiCheck,
    HiExclamation,
    HiRefresh,
    HiSearch,
    HiTrash,
    HiUserGroup,
    HiUsers,
} from 'react-icons/hi';
import { userManagementApi } from '../api';
import teamsConfig from '../config/teams';
import Toast from '../components/Toast/Toast';
import { useTimedToast } from '../hooks/useTimedToast';
import './UserManagementPage.css';

const DEFAULT_GROUP_FORM = {
    name: '',
    permissionKeys: [],
};

const DEFAULT_USER_FORM = {
    username: '',
    password: '',
    permissionKeys: [],
};

function toggleValue(list, value) {
    if (list.includes(value)) {
        return list.filter((item) => item !== value);
    }
    return [...list, value];
}

function MultiToggleGrid({ options, selectedValues, onToggle, emptyText = 'No options available' }) {
    const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
    if (!options.length) return <div className="user-management__empty-inline">{emptyText}</div>;

    return (
        <div className="user-management__toggle-grid">
            {options.map((item) => {
                const active = selectedSet.has(item.key);
                return (
                    <button
                        key={item.key}
                        type="button"
                        className={`user-management__toggle-chip ${active ? 'user-management__toggle-chip--active' : ''}`}
                        onClick={() => onToggle(item.key)}
                        title={item.description || item.label}
                    >
                        <span className="user-management__toggle-chip-main">{item.label}</span>
                        {item.meta && <span className="user-management__toggle-chip-meta">{item.meta}</span>}
                        {active && <HiCheck size={14} />}
                    </button>
                );
            })}
        </div>
    );
}

export default function UserManagementPage() {
    const { toastMessage, toastType, showToast, hideToast } = useTimedToast(3200);
    const [loading, setLoading] = useState(true);
    const [savingGroup, setSavingGroup] = useState(false);
    const [savingUser, setSavingUser] = useState(false);
    const [deletingGroupName, setDeletingGroupName] = useState('');
    const [deletingUserId, setDeletingUserId] = useState('');
    const [permissionKeys, setPermissionKeys] = useState([]);
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [editingGroupName, setEditingGroupName] = useState('');
    const [groupForm, setGroupForm] = useState(DEFAULT_GROUP_FORM);
    const [editingUserId, setEditingUserId] = useState('');
    const [userForm, setUserForm] = useState(DEFAULT_USER_FORM);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [groupSearch, setGroupSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const keyMetaMap = useMemo(() => {
        const map = {};
        Object.values(teamsConfig).forEach((team) => {
            const key = String(team?.permissionKey || '').trim();
            if (!key) return;
            map[key] = {
                name: team.name || team.id || key,
                color: team.color || 'var(--accent)',
                description: team.description || '',
            };
        });
        return map;
    }, []);

    const permissionKeyOptions = useMemo(
        () => permissionKeys.map((permissionKey) => ({
            key: permissionKey,
            label: permissionKey,
            meta: keyMetaMap[permissionKey]?.name || 'Custom',
            description: keyMetaMap[permissionKey]?.description || permissionKey,
        })),
        [permissionKeys, keyMetaMap],
    );

    const filteredGroups = useMemo(() => {
        const term = groupSearch.trim().toLowerCase();
        if (!term) return groups;

        return groups.filter((group) => {
            const name = String(group?.name || '').toLowerCase();
            const keys = Array.isArray(group?.permissionKeys) ? group.permissionKeys.join(' ').toLowerCase() : '';
            return name.includes(term) || keys.includes(term);
        });
    }, [groups, groupSearch]);

    const filteredUsers = useMemo(() => {
        const term = userSearch.trim().toLowerCase();
        if (!term) return users;

        return users.filter((user) => {
            const username = String(user?.username || '').toLowerCase();
            const keys = Array.isArray(user?.permissionKeys)
                ? user.permissionKeys
                : (Array.isArray(user?.teams) ? user.teams : []);
            const keyText = keys.join(' ').toLowerCase();
            return username.includes(term) || keyText.includes(term);
        });
    }, [users, userSearch]);

    const loadData = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);

        try {
            const [permissionsResponse, groupsResponse, usersResponse] = await Promise.all([
                userManagementApi.getPermissions(),
                userManagementApi.getGroups(),
                userManagementApi.getUsers(),
            ]);

            const nextPermissionKeys = Array.isArray(permissionsResponse?.permissionKeys)
                ? permissionsResponse.permissionKeys.map((item) => String(item))
                : [];
            const nextGroups = Array.isArray(groupsResponse?.groups) ? groupsResponse.groups : [];
            const nextUsers = Array.isArray(usersResponse?.users) ? usersResponse.users : [];

            setPermissionKeys(nextPermissionKeys);
            setGroups(nextGroups);
            setUsers(nextUsers);
        } catch (error) {
            showToast(error?.message || 'Failed to load user management data', 'error', 5200);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resetGroupForm = () => {
        setEditingGroupName('');
        setGroupForm(DEFAULT_GROUP_FORM);
    };

    const resetUserForm = () => {
        setEditingUserId('');
        setUserForm(DEFAULT_USER_FORM);
    };

    const handleGroupEdit = (group) => {
        setEditingGroupName(group.name);
        setGroupForm({
            name: group.name,
            permissionKeys: Array.isArray(group.permissionKeys) ? group.permissionKeys.map((item) => String(item)) : [],
        });
    };

    const handleGroupSubmit = async (event) => {
        event.preventDefault();
        const name = String(groupForm.name || '').trim();
        if (!name) {
            showToast('Group name is required', 'error');
            return;
        }

        setSavingGroup(true);
        try {
            if (editingGroupName) {
                await userManagementApi.updateGroup(editingGroupName, { permissionKeys: groupForm.permissionKeys });
                showToast(`Group "${editingGroupName}" updated`, 'success');
            } else {
                await userManagementApi.createGroup({ name, permissionKeys: groupForm.permissionKeys });
                showToast(`Group "${name}" created`, 'success');
            }
            resetGroupForm();
            await loadData({ silent: true });
        } catch (error) {
            showToast(error?.message || 'Group operation failed', 'error', 5200);
        } finally {
            setSavingGroup(false);
        }
    };

    const requestGroupDelete = (groupName) => {
        if (deletingGroupName || deletingUserId) return;
        setDeleteTarget({
            type: 'group',
            id: groupName,
            title: `Delete group "${groupName}"?`,
            message: 'Users assigned to this group will lose it.',
        });
    };

    const handleUserEdit = (user) => {
        const userPermissionKeys = Array.isArray(user.permissionKeys)
            ? user.permissionKeys.map((item) => String(item))
            : (Array.isArray(user.teams) ? user.teams.map((item) => String(item)) : []);

        setEditingUserId(user.id);
        setUserForm({
            username: user.username,
            password: '',
            permissionKeys: userPermissionKeys,
        });
    };

    const handleUserSubmit = async (event) => {
        event.preventDefault();
        const username = String(userForm.username || '').trim();
        const password = String(userForm.password || '');

        if (!editingUserId && !username) {
            showToast('Username is required', 'error');
            return;
        }
        if (!editingUserId && !password) {
            showToast('Password is required for a new user', 'error');
            return;
        }

        const payload = { permissionKeys: userForm.permissionKeys };
        if (password) payload.password = password;

        setSavingUser(true);
        try {
            if (editingUserId) {
                await userManagementApi.updateUser(editingUserId, payload);
                showToast(`User "${username}" updated`, 'success');
            } else {
                await userManagementApi.createUser({
                    username,
                    password,
                    permissionKeys: payload.permissionKeys,
                });
                showToast(`User "${username}" created`, 'success');
            }
            resetUserForm();
            await loadData({ silent: true });
        } catch (error) {
            showToast(error?.message || 'User operation failed', 'error', 5200);
        } finally {
            setSavingUser(false);
        }
    };

    const requestUserDelete = (user) => {
        if (deletingGroupName || deletingUserId) return;
        setDeleteTarget({
            type: 'user',
            id: user.id,
            title: `Delete user "${user.username}"?`,
            message: 'This user will be removed permanently.',
        });
    };

    const closeDeleteModal = () => {
        if (deletingGroupName || deletingUserId) return;
        setDeleteTarget(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        if (deleteTarget.type === 'group') {
            setDeletingGroupName(deleteTarget.id);
            try {
                await userManagementApi.deleteGroup(deleteTarget.id);
                if (editingGroupName === deleteTarget.id) resetGroupForm();
                showToast(`Group "${deleteTarget.id}" deleted`, 'success');
                await loadData({ silent: true });
                setDeleteTarget(null);
            } catch (error) {
                showToast(error?.message || 'Failed to delete group', 'error', 5200);
            } finally {
                setDeletingGroupName('');
            }
            return;
        }

        if (deleteTarget.type === 'user') {
            setDeletingUserId(deleteTarget.id);
            try {
                const selectedUser = users.find((item) => item.id === deleteTarget.id);
                await userManagementApi.deleteUser(deleteTarget.id);
                if (editingUserId === deleteTarget.id) resetUserForm();
                showToast(`User "${selectedUser?.username || deleteTarget.id}" deleted`, 'success');
                await loadData({ silent: true });
                setDeleteTarget(null);
            } catch (error) {
                showToast(error?.message || 'Failed to delete user', 'error', 5200);
            } finally {
                setDeletingUserId('');
            }
        }
    };

    return (
        <div className="page-container user-management-page">
            <div className="page-header user-management__header">
                <div className="user-management__title-wrap">
                    <div className="user-management__title-row">
                        <h1 className="page-title">User Management</h1>
                    </div>
                    <p className="page-subtitle">
                        Manage users and groups by permission keys.
                    </p>
                </div>
                <div className="user-management__title-stats">
                    <span className="user-management__title-stat">
                        <HiUsers size={16} />
                        <strong>{users.length}</strong>
                        <span>Users</span>
                    </span>
                    <span className="user-management__title-stat">
                        <HiUserGroup size={16} />
                        <strong>{groups.length}</strong>
                        <span>Groups</span>
                    </span>
                    <span className="user-management__title-stat">
                        <HiCheck size={16} />
                        <strong>{permissionKeys.length}</strong>
                        <span>Permission Screens</span>
                    </span>
                </div>
                <div className="page-actions">
                    <button
                        type="button"
                        className="btn user-management__refresh-btn"
                        onClick={() => loadData()}
                        disabled={loading}
                    >
                        <HiRefresh size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="page-content user-management__content">
                {loading && <section className="glass-card user-management__loading">Loading data...</section>}

                <section className="user-management__workspace">
                    <article className="glass-card user-management__panel">
                        <div className="user-management__section-head">
                            <div className="user-management__section-title">
                                <span className="user-management__section-icon user-management__section-icon--groups">
                                    <HiUserGroup size={18} />
                                </span>
                                <div>
                                    <h2>Groups</h2>
                                    <p>Map groups to permission keys</p>
                                </div>
                            </div>
                        </div>

                        <div className="user-management__panel-body">
                            <section className="user-management__list-wrap">
                                <div className="user-management__list-head">
                                    <p className="user-management__block-title">Existing Groups</p>
                                    <div className="user-management__search user-management__search--inline">
                                        <HiSearch size={15} />
                                        <input
                                            className="input-field"
                                            value={groupSearch}
                                            onChange={(event) => setGroupSearch(event.target.value)}
                                            placeholder="Search groups or permission keys"
                                            aria-label="Search groups"
                                        />
                                    </div>
                                </div>
                                <div className="user-management__list">
                                    {!filteredGroups.length && (
                                        <div className="user-management__empty-inline">
                                            {groupSearch ? 'No groups match your search' : 'No groups defined'}
                                        </div>
                                    )}
                                    {filteredGroups.map((group) => (
                                        <div
                                            key={group.name}
                                            className={`user-management__list-card ${editingGroupName === group.name ? 'user-management__list-card--active' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                className="user-management__list-main"
                                                onClick={() => handleGroupEdit(group)}
                                            >
                                                <div className="user-management__list-top-row">
                                                    <div className="user-management__list-name-block">
                                                        <strong>{group.name}</strong>
                                                        <span className="user-management__list-inline-meta">
                                                            Keys: {(group.permissionKeys || []).join(', ') || '-'}
                                                        </span>
                                                    </div>
                                                    <div className="user-management__list-metrics">
                                                        <span className="badge badge-accent">{(group.permissionKeys || []).length} keys</span>
                                                        <span className="badge badge-info">{group.screenCount || 0} screens</span>
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-icon user-management__delete-btn"
                                                onClick={() => requestGroupDelete(group.name)}
                                                disabled={deletingGroupName === group.name}
                                                title="Delete group"
                                            >
                                                <HiTrash size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="user-management__form-wrap">
                                <p className="user-management__block-title">
                                    {editingGroupName ? `Edit Group: ${editingGroupName}` : 'Create Group'}
                                </p>
                                <form className="user-management__form" onSubmit={handleGroupSubmit}>
                                    <label className="form-label" htmlFor="group-name">Group Name</label>
                                    <input
                                        id="group-name"
                                        className="input-field"
                                        value={groupForm.name}
                                        onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="Example: StorageOps"
                                        disabled={!!editingGroupName}
                                    />

                                    <label className="form-label">Permission Keys</label>
                                    <MultiToggleGrid
                                        options={permissionKeyOptions}
                                        selectedValues={groupForm.permissionKeys}
                                        onToggle={(permissionKey) => {
                                            setGroupForm((prev) => ({
                                                ...prev,
                                                permissionKeys: toggleValue(prev.permissionKeys, permissionKey),
                                            }));
                                        }}
                                        emptyText="No keys available"
                                    />

                                    <div className="user-management__form-actions">
                                        <button type="submit" className="btn btn-primary" disabled={savingGroup}>
                                            {savingGroup ? 'Saving...' : (editingGroupName ? 'Update Group' : 'Create Group')}
                                        </button>
                                        {editingGroupName && (
                                            <button type="button" className="btn btn-secondary" onClick={resetGroupForm}>
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </section>
                        </div>
                    </article>

                    <article className="glass-card user-management__panel">
                        <div className="user-management__section-head">
                            <div className="user-management__section-title">
                                <span className="user-management__section-icon user-management__section-icon--users">
                                    <HiUsers size={18} />
                                </span>
                                <div>
                                    <h2>Users</h2>
                                    <p>Assign permission keys and credentials</p>
                                </div>
                            </div>
                        </div>

                        <div className="user-management__panel-body">
                            <section className="user-management__list-wrap">
                                <div className="user-management__list-head">
                                    <p className="user-management__block-title">Existing Users</p>
                                    <div className="user-management__search user-management__search--inline">
                                        <HiSearch size={15} />
                                        <input
                                            className="input-field"
                                            value={userSearch}
                                            onChange={(event) => setUserSearch(event.target.value)}
                                            placeholder="Search users or permission keys"
                                            aria-label="Search users"
                                        />
                                    </div>
                                </div>
                                <div className="user-management__list">
                                    {!filteredUsers.length && (
                                        <div className="user-management__empty-inline">
                                            {userSearch ? 'No users match your search' : 'No users defined'}
                                        </div>
                                    )}
                                    {filteredUsers.map((user) => {
                                        const userPermissionKeys = Array.isArray(user.permissionKeys)
                                            ? user.permissionKeys
                                            : (Array.isArray(user.teams) ? user.teams : []);

                                        return (
                                            <div
                                                key={user.id}
                                                className={`user-management__list-card ${editingUserId === user.id ? 'user-management__list-card--active' : ''}`}
                                            >
                                                <button
                                                    type="button"
                                                    className="user-management__list-main"
                                                    onClick={() => handleUserEdit(user)}
                                                >
                                                    <div className="user-management__list-top-row">
                                                        <div className="user-management__list-name-block">
                                                            <strong>{user.username}</strong>
                                                            <span className="user-management__list-inline-meta">
                                                                Keys: {userPermissionKeys.join(', ') || '-'}
                                                            </span>
                                                        </div>
                                                        <div className="user-management__list-metrics">
                                                            <span className="badge badge-accent">{userPermissionKeys.length} keys</span>
                                                        </div>
                                                    </div>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-icon user-management__delete-btn"
                                                    onClick={() => requestUserDelete(user)}
                                                    disabled={deletingUserId === user.id}
                                                    title="Delete user"
                                                >
                                                    <HiTrash size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="user-management__form-wrap">
                                <p className="user-management__block-title">
                                    {editingUserId ? `Edit User: ${userForm.username}` : 'Create User'}
                                </p>
                                <form className="user-management__form" onSubmit={handleUserSubmit}>
                                    <label className="form-label" htmlFor="user-name">Username</label>
                                    <input
                                        id="user-name"
                                        className="input-field"
                                        value={userForm.username}
                                        onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                                        placeholder="Example: support-user"
                                        disabled={!!editingUserId}
                                    />

                                    <label className="form-label" htmlFor="user-password">
                                        {editingUserId ? 'New Password (optional)' : 'Password'}
                                    </label>
                                    <input
                                        id="user-password"
                                        className="input-field"
                                        type="password"
                                        value={userForm.password}
                                        onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                                        placeholder={editingUserId ? 'Leave empty to keep current password' : 'Enter password'}
                                    />

                                    <label className="form-label">Permission Keys</label>
                                    <MultiToggleGrid
                                        options={permissionKeyOptions}
                                        selectedValues={userForm.permissionKeys}
                                        onToggle={(permissionKey) => {
                                            setUserForm((prev) => ({
                                                ...prev,
                                                permissionKeys: toggleValue(prev.permissionKeys, permissionKey),
                                            }));
                                        }}
                                        emptyText="No keys available"
                                    />

                                    <div className="user-management__form-actions">
                                        <button type="submit" className="btn btn-primary" disabled={savingUser}>
                                            {savingUser ? 'Saving...' : (editingUserId ? 'Update User' : 'Create User')}
                                        </button>
                                        {editingUserId && (
                                            <button type="button" className="btn btn-secondary" onClick={resetUserForm}>
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </section>
                        </div>
                    </article>
                </section>
            </div>

            {deleteTarget && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal-content user-management__confirm-dialog" onClick={(event) => event.stopPropagation()}>
                        <div className="user-management__confirm-head">
                            <span className="user-management__confirm-icon" aria-hidden="true">
                                <HiExclamation size={18} />
                            </span>
                            <h3>{deleteTarget.title}</h3>
                        </div>
                        <p className="user-management__confirm-text">{deleteTarget.message}</p>
                        <div className="user-management__confirm-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={closeDeleteModal}
                                disabled={!!deletingGroupName || !!deletingUserId}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={confirmDelete}
                                disabled={!!deletingGroupName || !!deletingUserId}
                            >
                                {deletingGroupName || deletingUserId ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast message={toastMessage} type={toastType} onClose={hideToast} />
        </div>
    );
}
