import { HiCheckCircle, HiX } from 'react-icons/hi';
import './Toast.css';

export default function Toast({ message, onClose, type = 'success' }) {
    if (!message) return null;
    const icon = type === 'error' ? '!' : <HiCheckCircle size={20} />;

    return (
        <div className={`app-toast app-toast--${type}`} role="status" aria-live="polite">
            <div className="app-toast__icon">
                {icon}
            </div>
            <div className="app-toast__content">{message}</div>
            <button className="app-toast__close" onClick={onClose} aria-label="Close notification">
                <HiX size={16} />
            </button>
        </div>
    );
}
