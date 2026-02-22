import { HiSearch, HiTrash, HiUsers } from 'react-icons/hi';
import MultiToggleGrid from './MultiToggleGrid';
import {
    getUserId,
    getUserPermissions,
    getUserType,
} from '../../utils/userManagementHandlers';

export default function UsersPanel({
    filteredUsers,
    userSearch,
    editingUserId,
    deletingUserId,
    editingUserLabel,
    savingUser,
    userForm,
    permissionOptions,
    onUserSearchChange,
    onUserEdit,
    onUserDeleteRequest,
    onUserSubmit,
    onUserFieldChange,
    onUserPermissionToggle,
    onUserCancel,
    onUserNew,
}) {
    const isAdfsCreate = !editingUserId && userForm.type === 'adfs';

    return (
        <article className="glass-card user-management__panel">
            <div className="user-management__section-head">
                <div className="user-management__section-head-main">
                    <div className="user-management__section-title">
                        <span className="user-management__section-icon user-management__section-icon--users">
                            <HiUsers size={18} />
                        </span>
                        <div>
                            <h2>Users</h2>
                            <p>Assign permissions and credentials</p>
                        </div>
                    </div>
                    <button type="button" className="btn btn-secondary user-management__section-add-btn" onClick={onUserNew}>
                        New User
                    </button>
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
                                onChange={(event) => onUserSearchChange(event.target.value)}
                                placeholder="Search users, type, or permissions"
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
                            const userPermissions = getUserPermissions(user);
                            const userId = getUserId(user);
                            const userType = getUserType(user);

                            return (
                                <div
                                    key={userId}
                                    className={`user-management__list-card ${editingUserId === userId ? 'user-management__list-card--active' : ''}`}
                                >
                                    <button
                                        type="button"
                                        className="user-management__list-main"
                                        onClick={() => onUserEdit(user)}
                                    >
                                        <div className="user-management__list-top-row">
                                            <div className="user-management__list-name-block">
                                                <strong>{user.username}</strong>
                                                <span className="user-management__list-inline-meta">
                                                    Permissions: {userPermissions.join(', ') || '-'}
                                                </span>
                                            </div>
                                            <div className="user-management__list-metrics">
                                                <span className="badge badge-accent">{userPermissions.length} permissions</span>
                                                <span className="badge badge-info">{userType}</span>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-icon user-management__delete-btn"
                                        onClick={() => onUserDeleteRequest(user)}
                                        disabled={deletingUserId === userId}
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
                        {editingUserId ? `Edit User: ${editingUserLabel}` : 'Create User'}
                    </p>
                    <form className="user-management__form" onSubmit={onUserSubmit}>
                        <label className="form-label" htmlFor="user-name">Username</label>
                        <input
                            id="user-name"
                            className="input-field"
                            value={userForm.username}
                            onChange={(event) => onUserFieldChange('username', event.target.value)}
                            placeholder="Example: support-user"
                            disabled={!!editingUserId}
                        />

                        <label className="form-label" htmlFor="user-type">Type</label>
                        <select
                            id="user-type"
                            className="select-field"
                            value={userForm.type}
                            onChange={(event) => onUserFieldChange('type', event.target.value)}
                        >
                            <option value="local">local</option>
                            <option value="adfs">adfs</option>
                        </select>

                        <label className="form-label" htmlFor="user-password">
                            {editingUserId
                                ? 'New Password (optional)'
                                : (isAdfsCreate ? 'Password (not required for ADFS)' : 'Password')}
                        </label>
                        <input
                            id="user-password"
                            className="input-field"
                            type="password"
                            value={userForm.password}
                            onChange={(event) => onUserFieldChange('password', event.target.value)}
                            placeholder={
                                editingUserId
                                    ? 'Leave empty to keep current password'
                                    : (isAdfsCreate ? 'Not required for ADFS users' : 'Enter password')
                            }
                            disabled={isAdfsCreate}
                        />

                        <label className="form-label">Permissions</label>
                        <MultiToggleGrid
                            options={permissionOptions}
                            selectedValues={userForm.permissions}
                            onToggle={onUserPermissionToggle}
                            emptyText="No permissions available"
                        />

                        <div className="user-management__form-actions">
                            <button type="submit" className="btn btn-primary" disabled={savingUser}>
                                {savingUser ? 'Saving...' : (editingUserId ? 'Update User' : 'Create User')}
                            </button>
                            {editingUserId && (
                                <button type="button" className="btn btn-secondary" onClick={onUserCancel}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            </div>
        </article>
    );
}
