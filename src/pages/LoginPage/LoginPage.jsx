import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
    const { isAuthenticated, loginLocal, loginAdfs } = useAuth();
    const navigate = useNavigate();

    const [method, setMethod] = useState('local');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleLocalLogin = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await loginLocal({ username, password });
            navigate('/', { replace: true });
        } catch {
            setError('Invalid local user. Try: admin, sarah, john');
        } finally {
            setLoading(false);
        }
    };

    const handleAdfsLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginAdfs();
            navigate('/', { replace: true });
        } catch {
            setError('ADFS sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card">
                <div className="login-header">
                    <h1 className="login-title">Kupa Rashit</h1>
                    <p className="login-subtitle">Sign in with ADFS or local user</p>
                </div>

                <div className="login-methods">
                    <button
                        className={`login-method-btn ${method === 'local' ? 'active' : ''}`}
                        onClick={() => setMethod('local')}
                    >
                        Local User
                    </button>
                    <button
                        className={`login-method-btn ${method === 'adfs' ? 'active' : ''}`}
                        onClick={() => setMethod('adfs')}
                    >
                        ADFS
                    </button>
                </div>

                {method === 'local' ? (
                    <form onSubmit={handleLocalLogin} className="login-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="input-field"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin / sarah / john"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                        </div>
                        {error && <div className="login-error">{error}</div>}
                        <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <div className="login-form">
                        <p className="login-adfs-text">Use enterprise SSO inside the company network.</p>
                        {error && <div className="login-error">{error}</div>}
                        <button className="btn btn-primary login-btn" onClick={handleAdfsLogin} disabled={loading}>
                            {loading ? 'Redirecting...' : 'Continue with ADFS'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
