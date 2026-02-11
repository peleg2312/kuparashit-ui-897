import { useTeam } from '../contexts/TeamContext';
import { HiLockClosed, HiArrowLeft } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { getScreensByGroup } from '../config/screens';

export default function UnauthorizedPage() {
    const { currentTeam } = useTeam();
    const navigate = useNavigate();
    const groups = getScreensByGroup(currentTeam?.screens || []);
    const firstGroup = Object.values(groups)[0];
    const firstPath = firstGroup?.screens?.[0]?.path || '/';

    return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--error-bg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                }}>
                    <HiLockClosed size={36} style={{ color: 'var(--error)' }} />
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Access Denied</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                    The <strong>{currentTeam?.name || 'current'}</strong> team does not have access to this screen.
                    Please switch to a team with the required permissions.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        <HiArrowLeft size={16} />
                        Go Back
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate(firstPath, { replace: true })}>
                        Open Allowed Screen
                    </button>
                </div>
            </div>
        </div>
    );
}
