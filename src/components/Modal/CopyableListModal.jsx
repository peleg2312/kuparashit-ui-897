import { HiX } from 'react-icons/hi';
import { copyListToClipboard } from '../../utils/clipboardHandlers';
import { useTimedToast } from '../../hooks/useTimedToast';
import Toast from '../Toast/Toast';

export default function CopyableListModal({
    title,
    subtitle,
    items,
    onClose,
    copySuccessMessage = 'Copied list',
    copyErrorMessage = 'Copy failed',
}) {
    const { toastMessage, toastType, showToast, hideToast } = useTimedToast(2400);

    const copyAll = async () => {
        try {
            await copyListToClipboard(items);
            showToast(copySuccessMessage, 'success');
        } catch {
            showToast(copyErrorMessage, 'error');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 760 }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>{title}</h3>
                        <p className="page-subtitle">{subtitle}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><HiX size={20} /></button>
                </div>
                <div className="modal-body" style={{ display: 'grid', gap: 8 }}>
                    {items.map((item) => (
                        <div
                            key={item}
                            style={{
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                background: 'var(--bg-input)',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '0.84rem',
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={copyAll}>Copy All</button>
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
            <Toast message={toastMessage} type={toastType} onClose={hideToast} />
        </div>
    );
}
