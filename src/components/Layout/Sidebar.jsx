import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTeam } from '../../contexts/TeamContext';
import { getScreensByGroup } from '../../config/screens';
import { HiMenuAlt2 } from 'react-icons/hi';
import './Sidebar.css';

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { currentTeam } = useTeam();
    const location = useLocation();

    const allowedScreens = currentTeam ? currentTeam.screens : [];
    const groups = getScreensByGroup(allowedScreens);

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            <div className="sidebar__header">
                {!collapsed && (
                    <div className="sidebar__brand">
                        <span className="sidebar__brand-name">Kupa Rashit</span>
                    </div>
                )}
                <button
                    className="btn-icon sidebar__toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <HiMenuAlt2 size={24} />
                </button>
            </div>

            <nav className="sidebar__nav">
                {Object.entries(groups).map(([groupKey, group]) => (
                    <div key={groupKey} className="sidebar__group">
                        {!collapsed && <span className="sidebar__group-label">{group.label}</span>}
                        {group.screens.map(screen => {
                            const Icon = screen.icon;
                            const isActive = location.pathname.startsWith(screen.path);
                            return (
                                <NavLink
                                    key={screen.id}
                                    to={screen.path}
                                    className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                                    title={collapsed ? screen.label : ''}
                                >
                                    <span className="sidebar__link-icon">
                                        <Icon size={22} />
                                    </span>
                                    {!collapsed && (
                                        <>
                                            <span className="sidebar__link-text">{screen.label}</span>
                                            {isActive && <div className="sidebar__active-indicator" />}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar__footer">
                {!collapsed && <span className="sidebar__version">v1.2.0</span>}
            </div>
        </aside>
    );
}
