import { HiCheck, HiRefresh, HiUserGroup, HiUsers } from 'react-icons/hi';

export default function UserManagementHeader({
    userCount,
    groupCount,
    permissionCount,
    loading,
    onRefresh,
}) {
    return (
        <div className="page-header user-management__header">
            <div className="user-management__title-wrap">
                <div className="user-management__title-row">
                    <h1 className="page-title">User Management</h1>
                </div>
                <p className="page-subtitle">
                    Manage users and groups by permissions.
                </p>
            </div>
            <div className="user-management__title-stats">
                <span className="user-management__title-stat">
                    <HiUsers size={16} />
                    <strong>{userCount}</strong>
                    <span>Users</span>
                </span>
                <span className="user-management__title-stat">
                    <HiUserGroup size={16} />
                    <strong>{groupCount}</strong>
                    <span>Groups</span>
                </span>
                <span className="user-management__title-stat">
                    <HiCheck size={16} />
                    <strong>{permissionCount}</strong>
                    <span>Permissions</span>
                </span>
            </div>
            <div className="page-actions">
                <button
                    type="button"
                    className="btn user-management__refresh-btn"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    <HiRefresh size={16} />
                    Refresh
                </button>
            </div>
        </div>
    );
}
