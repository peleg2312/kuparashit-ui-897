import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { useTheme } from '../../contexts/ThemeContext';
import { HiSun, HiMoon, HiChevronDown } from 'react-icons/hi';
import './Header.css';

export default function Header() {
    const { user, authMode } = useAuth();
    const { currentTeam, userTeams, switchTeam } = useTeam();
    const { theme, toggleTheme } = useTheme();

    const [showTeamMenu, setShowTeamMenu] = useState(false);
    const teamRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            // Check if click is outside ref
            if (teamRef.current && !teamRef.current.contains(e.target)) {
                setShowTeamMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

    return (
        <header className="app-header">
            {/* Left: Team Switcher (Clickable Logo) */}
            <div className="header__left" ref={teamRef}>
                <button
                    className="header__team-btn"
                    onClick={() => setShowTeamMenu(!showTeamMenu)}
                    title="Switch Team"
                >
                    <div className="header__team-icon" style={{ background: currentTeam?.color || 'var(--accent)' }}>
                        {currentTeam?.name?.[0] || '?'}
                    </div>
                    <div className="header__team-info">
                        <span className="header__team-name">{currentTeam?.name || 'Select Team'}</span>
                        <span className="header__team-role">Workspace</span>
                    </div>
                    <HiChevronDown size={16} className={`header__chevron ${showTeamMenu ? 'rotate-180' : ''}`} />
                </button>

                {showTeamMenu && (
                    <div className="header__dropdown animate-slide-down">
                        <div className="dropdown-label">Available Teams</div>
                        {userTeams.map(team => (
                            <button
                                key={team.id}
                                className={`header__dropdown-item ${team.id === currentTeam?.id ? 'active' : ''}`}
                                onClick={() => { switchTeam(team.id); setShowTeamMenu(false); }}
                            >
                                <div className="header__dropdown-icon" style={{ background: team.color }}>{team.name[0]}</div>
                                <div className="header__dropdown-text">
                                    <div className="header__dropdown-name">{team.name}</div>
                                    <div className="header__dropdown-desc">{team.description}</div>
                                </div>
                                {team.id === currentTeam?.id && <div className="active-dot" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Theme Toggle & User Info */}
            <div className="header__right">
                <span className="badge badge-accent">{authMode.toUpperCase()}</span>

                <button
                    className="btn-icon theme-toggle"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                    {theme === 'light' ? <HiMoon size={22} /> : <HiSun size={22} />}
                </button>

                <div className="header__divider" />

                <div className="header__user">
                    <div className="header__user-info">
                        <span className="header__user-name">{user?.name}</span>
                        <span className="header__user-role">{authMode.toUpperCase()} • {user?.role || 'guest'}</span>
                    </div>
                    <div className="header__avatar">
                        {getInitials(user?.name)}
                        <div className="status-dot" />
                    </div>
                </div>
            </div>
        </header>
    );
}
