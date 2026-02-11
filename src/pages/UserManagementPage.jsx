import { useState, useEffect } from 'react';
import { mainApi } from '../api';
import DataTable from '../components/DataTable/DataTable';
import { HiPlus, HiPencil, HiTrash, HiX, HiUserAdd } from 'react-icons/hi';
import './UserManagement.css';

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'viewer', teams: [] });

    useEffect(() => {
        mainApi.getUsers().then(u => { setUsers(u); setLoading(false); });
    }, []);

    const columns = [
        {
            key: 'name',
            label: 'User',
            render: (val, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="um-avatar">{val.split(' ').map(n => n[0]).join('')}</div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{val}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'role', label: 'Role', filterable: true, render: (val) => (
                <span className={`badge ${val === 'admin' ? 'badge-accent' : val === 'operator' ? 'badge-info' : 'badge-warning'}`}>{val}</span>
            )
        },
        {
            key: 'teams', label: 'Teams', render: (val) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    {(val || []).map(t => <span key={t} className="badge badge-info">{t}</span>)}
                </div>
            )
        },
        {
            key: 'id',
            label: 'Actions',
            sortable: false,
            render: (val, row) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" title="Edit" onClick={() => openEdit(row)}>
                        <HiPencil size={14} />
                    </button>
                    <button className="btn-icon" title="Delete" onClick={() => handleDelete(val)} style={{ color: 'var(--error)' }}>
                        <HiTrash size={14} />
                    </button>
                </div>
            ),
        },
    ];

    const openEdit = (user) => {
        setEditUser(user);
        setFormData({ name: user.name, email: user.email, role: user.role, teams: user.teams || [] });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditUser(null);
        setFormData({ name: '', email: '', role: 'viewer', teams: [] });
        setShowModal(true);
    };

    const handleSave = () => {
        if (editUser) {
            setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...formData } : u));
        } else {
            setUsers(prev => [...prev, { id: `u${Date.now()}`, ...formData }]);
        }
        setShowModal(false);
    };

    const handleDelete = (id) => {
        setUsers(prev => prev.filter(u => u.id !== id));
    };

    const toggleTeam = (team) => {
        setFormData(prev => ({
            ...prev,
            teams: prev.teams.includes(team)
                ? prev.teams.filter(t => t !== team)
                : [...prev.teams, team],
        }));
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage users, roles, and team assignments</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreate}>
                        <HiUserAdd size={16} />
                        Add User
                    </button>
                </div>
            </div>

            <div className="page-content">
                <DataTable columns={columns} data={users} loading={loading} />
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editUser ? 'Edit User' : 'Add New User'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <HiX size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    className="input-field"
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Enter full name..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="input-field"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                    placeholder="Enter email..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    className="select-field"
                                    value={formData.role}
                                    onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="operator">Operator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teams</label>
                                <div className="um-team-toggles">
                                    {['BLOCK', 'NASA'].map(team => (
                                        <button
                                            key={team}
                                            className={`um-team-toggle ${formData.teams.includes(team) ? 'um-team-toggle--active' : ''}`}
                                            onClick={() => toggleTeam(team)}
                                        >
                                            {team}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={!formData.name || !formData.email}>
                                {editUser ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
