import { HiSearch, HiTrash, HiUserGroup } from 'react-icons/hi';
import MultiToggleGrid from './MultiToggleGrid';
import { getGroupId, getGroupName, getGroupPermissions } from '../../utils/userManagementHandlers';

export default function GroupsPanel({
    filteredGroups,
    groupSearch,
    editingGroupId,
    editingGroupLabel,
    deletingGroupId,
    savingGroup,
    groupForm,
    permissionOptions,
    onGroupSearchChange,
    onGroupEdit,
    onGroupDeleteRequest,
    onGroupSubmit,
    onGroupNameChange,
    onGroupPermissionToggle,
    onGroupCancel,
    onGroupNew,
}) {
    return (
        <article className="glass-card user-management__panel">
            <div className="user-management__section-head">
                <div className="user-management__section-head-main">
                    <div className="user-management__section-title">
                        <span className="user-management__section-icon user-management__section-icon--groups">
                            <HiUserGroup size={18} />
                        </span>
                        <div>
                            <h2>Groups</h2>
                            <p>Map groups to permissions</p>
                        </div>
                    </div>
                    <button type="button" className="btn btn-secondary user-management__section-add-btn" onClick={onGroupNew}>
                        New Group
                    </button>
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
                                onChange={(event) => onGroupSearchChange(event.target.value)}
                                placeholder="Search groups or permissions"
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
                                key={getGroupId(group)}
                                className={`user-management__list-card ${editingGroupId === getGroupId(group) ? 'user-management__list-card--active' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="user-management__list-main"
                                    onClick={() => onGroupEdit(group)}
                                >
                                    <div className="user-management__list-top-row">
                                        <div className="user-management__list-name-block">
                                            <strong>{getGroupName(group)}</strong>
                                            <span className="user-management__list-inline-meta">
                                                Permissions: {getGroupPermissions(group).join(', ') || '-'}
                                            </span>
                                        </div>
                                        <div className="user-management__list-metrics">
                                            <span className="badge badge-accent">{getGroupPermissions(group).length} permissions</span>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon user-management__delete-btn"
                                    onClick={() => onGroupDeleteRequest(group)}
                                    disabled={deletingGroupId === getGroupId(group)}
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
                        {editingGroupId ? `Edit Group: ${editingGroupLabel}` : 'Create Group'}
                    </p>
                    <form className="user-management__form" onSubmit={onGroupSubmit}>
                        <label className="form-label" htmlFor="group-name">Group</label>
                        <input
                            id="group-name"
                            className="input-field"
                            value={groupForm.group}
                            onChange={(event) => onGroupNameChange(event.target.value)}
                            placeholder="Example: StorageOps"
                            disabled={!!editingGroupId}
                        />

                        <label className="form-label">Permissions</label>
                        <MultiToggleGrid
                            options={permissionOptions}
                            selectedValues={groupForm.permissions}
                            onToggle={onGroupPermissionToggle}
                            emptyText="No permissions available"
                        />

                        <div className="user-management__form-actions">
                            <button type="submit" className="btn btn-primary" disabled={savingGroup}>
                                {savingGroup ? 'Saving...' : (editingGroupId ? 'Update Group' : 'Create Group')}
                            </button>
                            {editingGroupId && (
                                <button type="button" className="btn btn-secondary" onClick={onGroupCancel}>
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
