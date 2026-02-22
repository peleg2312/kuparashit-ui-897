import { useCallback, useEffect, useMemo, useState } from 'react';
import { userManagementApi } from '../api';
import DeleteConfirmModal from '../components/UserManagement/DeleteConfirmModal';
import GroupsPanel from '../components/UserManagement/GroupsPanel';
import UserManagementHeader from '../components/UserManagement/UserManagementHeader';
import UsersPanel from '../components/UserManagement/UsersPanel';
import Toast from '../components/Toast/Toast';
import teamsConfig from '../config/teams';
import { useTimedToast } from '../hooks/useTimedToast';
import {
    DEFAULT_GROUP_FORM,
    DEFAULT_USER_FORM,
    getGroupId,
    getGroupName,
    getGroupPermissions,
    getUserId,
    getUserPermissions,
    getUserType,
    toggleValue,
} from '../utils/userManagementHandlers';
import './UserManagementPage.css';

export default function UserManagementPage() {
    const { toastMessage, toastType, showToast, hideToast } = useTimedToast(3200);
    const [loading, setLoading] = useState(true);
    const [savingGroup, setSavingGroup] = useState(false);
    const [savingUser, setSavingUser] = useState(false);
    const [deletingGroupId, setDeletingGroupId] = useState('');
    const [deletingUserId, setDeletingUserId] = useState('');
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [editingGroupId, setEditingGroupId] = useState('');
    const [groupForm, setGroupForm] = useState(DEFAULT_GROUP_FORM);
    const [editingUserId, setEditingUserId] = useState('');
    const [userForm, setUserForm] = useState(DEFAULT_USER_FORM);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [groupSearch, setGroupSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const isDeleting = !!deletingGroupId || !!deletingUserId;

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

    const permissionOptions = useMemo(
        () => availablePermissions.map((permission) => ({
            key: permission,
            label: permission,
            meta: keyMetaMap[permission]?.name || 'Custom',
            description: keyMetaMap[permission]?.description || permission,
        })),
        [availablePermissions, keyMetaMap],
    );

    const filteredGroups = useMemo(() => {
        const term = groupSearch.trim().toLowerCase();
        if (!term) return groups;

        return groups.filter((group) => {
            const groupName = getGroupName(group).toLowerCase();
            const permissions = getGroupPermissions(group).join(' ').toLowerCase();
            return groupName.includes(term) || permissions.includes(term);
        });
    }, [groups, groupSearch]);

    const filteredUsers = useMemo(() => {
        const term = userSearch.trim().toLowerCase();
        if (!term) return users;

        return users.filter((user) => {
            const username = String(user?.username || '').toLowerCase();
            const userType = getUserType(user).toLowerCase();
            const permissions = getUserPermissions(user).join(' ').toLowerCase();
            return username.includes(term) || userType.includes(term) || permissions.includes(term);
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

            const nextPermissions = Array.isArray(permissionsResponse?.permissions)
                ? permissionsResponse.permissions.map((item) => String(item))
                : (Array.isArray(permissionsResponse?.permissionKeys)
                    ? permissionsResponse.permissionKeys.map((item) => String(item))
                    : []);
            const nextGroups = Array.isArray(groupsResponse?.groups) ? groupsResponse.groups : [];
            const nextUsers = Array.isArray(usersResponse?.users) ? usersResponse.users : [];

            setAvailablePermissions(nextPermissions);
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
        setEditingGroupId('');
        setGroupForm(DEFAULT_GROUP_FORM);
    };

    const resetUserForm = () => {
        setEditingUserId('');
        setUserForm(DEFAULT_USER_FORM);
    };

    const handleGroupEdit = (group) => {
        setEditingGroupId(getGroupId(group));
        setGroupForm({
            group: getGroupName(group),
            permissions: getGroupPermissions(group),
        });
    };

    const handleGroupSubmit = async (event) => {
        event.preventDefault();
        const group = String(groupForm.group || '').trim();
        if (!group) {
            showToast('Group name is required', 'error');
            return;
        }

        setSavingGroup(true);
        try {
            const payload = {
                group,
                permissions: groupForm.permissions,
            };

            if (editingGroupId) {
                await userManagementApi.updateGroup(editingGroupId, payload);
                showToast(`Group "${group}" updated`, 'success');
            } else {
                await userManagementApi.createGroup(payload);
                showToast(`Group "${group}" created`, 'success');
            }
            resetGroupForm();
            await loadData({ silent: true });
        } catch (error) {
            showToast(error?.message || 'Group operation failed', 'error', 5200);
        } finally {
            setSavingGroup(false);
        }
    };

    const requestGroupDelete = (group) => {
        if (isDeleting) return;
        const groupId = getGroupId(group);
        const groupLabel = getGroupName(group) || groupId;
        if (!groupId) return;

        setDeleteTarget({
            type: 'group',
            id: groupId,
            label: groupLabel,
            title: `Delete group "${groupLabel}"?`,
            message: 'Users assigned to this group will lose it.',
        });
    };

    const handleUserEdit = (user) => {
        setEditingUserId(getUserId(user));
        setUserForm({
            username: String(user?.username || ''),
            password: '',
            permissions: getUserPermissions(user),
            type: getUserType(user),
        });
    };

    const handleUserSubmit = async (event) => {
        event.preventDefault();
        const username = String(userForm.username || '').trim();
        const password = String(userForm.password || '');
        const type = String(userForm.type || 'local').toLowerCase() === 'adfs' ? 'adfs' : 'local';

        if (!editingUserId && !username) {
            showToast('Username is required', 'error');
            return;
        }
        if (!editingUserId && type === 'local' && !password) {
            showToast('Password is required for a new local user', 'error');
            return;
        }

        const payload = {
            username,
            type,
            permissions: userForm.permissions,
        };

        if (password && (editingUserId || type === 'local')) {
            payload.password = password;
        }

        setSavingUser(true);
        try {
            if (editingUserId) {
                await userManagementApi.updateUser(editingUserId, payload);
                showToast(`User "${username}" updated`, 'success');
            } else {
                await userManagementApi.createUser(payload);
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
        if (isDeleting) return;
        const userId = getUserId(user);
        const userLabel = String(user?.username || userId);
        if (!userId) return;

        setDeleteTarget({
            type: 'user',
            id: userId,
            label: userLabel,
            title: `Delete user "${userLabel}"?`,
            message: 'This user will be removed permanently.',
        });
    };

    const closeDeleteModal = () => {
        if (isDeleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        if (deleteTarget.type === 'group') {
            setDeletingGroupId(deleteTarget.id);
            try {
                await userManagementApi.deleteGroup(deleteTarget.id);
                if (editingGroupId === deleteTarget.id) resetGroupForm();
                showToast(`Group "${deleteTarget.label || deleteTarget.id}" deleted`, 'success');
                await loadData({ silent: true });
                setDeleteTarget(null);
            } catch (error) {
                showToast(error?.message || 'Failed to delete group', 'error', 5200);
            } finally {
                setDeletingGroupId('');
            }
            return;
        }

        if (deleteTarget.type === 'user') {
            setDeletingUserId(deleteTarget.id);
            try {
                const selectedUser = users.find((item) => getUserId(item) === deleteTarget.id);
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
            <UserManagementHeader
                userCount={users.length}
                groupCount={groups.length}
                permissionCount={availablePermissions.length}
                loading={loading}
                onRefresh={loadData}
            />

            <div className="page-content user-management__content">
                {loading && <section className="glass-card user-management__loading">Loading data...</section>}

                <section className="user-management__workspace">
                    <GroupsPanel
                        filteredGroups={filteredGroups}
                        groupSearch={groupSearch}
                        editingGroupId={editingGroupId}
                        editingGroupLabel={groupForm.group}
                        deletingGroupId={deletingGroupId}
                        savingGroup={savingGroup}
                        groupForm={groupForm}
                        permissionOptions={permissionOptions}
                        onGroupSearchChange={setGroupSearch}
                        onGroupEdit={handleGroupEdit}
                        onGroupDeleteRequest={requestGroupDelete}
                        onGroupSubmit={handleGroupSubmit}
                        onGroupNameChange={(group) => setGroupForm((prev) => ({ ...prev, group }))}
                        onGroupPermissionToggle={(permission) => {
                            setGroupForm((prev) => ({
                                ...prev,
                                permissions: toggleValue(prev.permissions, permission),
                            }));
                        }}
                        onGroupCancel={resetGroupForm}
                        onGroupNew={resetGroupForm}
                    />

                    <UsersPanel
                        filteredUsers={filteredUsers}
                        userSearch={userSearch}
                        editingUserId={editingUserId}
                        editingUserLabel={userForm.username}
                        deletingUserId={deletingUserId}
                        savingUser={savingUser}
                        userForm={userForm}
                        permissionOptions={permissionOptions}
                        onUserSearchChange={setUserSearch}
                        onUserEdit={handleUserEdit}
                        onUserDeleteRequest={requestUserDelete}
                        onUserSubmit={handleUserSubmit}
                        onUserFieldChange={(field, value) => {
                            setUserForm((prev) => {
                                const next = { ...prev, [field]: value };
                                if (field === 'type' && value === 'adfs' && !editingUserId) {
                                    next.password = '';
                                }
                                return next;
                            });
                        }}
                        onUserPermissionToggle={(permission) => {
                            setUserForm((prev) => ({
                                ...prev,
                                permissions: toggleValue(prev.permissions, permission),
                            }));
                        }}
                        onUserCancel={resetUserForm}
                        onUserNew={resetUserForm}
                    />
                </section>
            </div>

            <DeleteConfirmModal
                deleteTarget={deleteTarget}
                deleting={isDeleting}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
            />

            <Toast message={toastMessage} type={toastType} onClose={hideToast} />
        </div>
    );
}
