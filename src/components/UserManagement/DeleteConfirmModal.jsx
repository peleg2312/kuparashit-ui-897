import { HiExclamation } from 'react-icons/hi';

export default function DeleteConfirmModal({ deleteTarget, deleting, onClose, onConfirm }) {
    if (!deleteTarget) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content user-management__confirm-dialog" onClick={(event) => event.stopPropagation()}>
                <div className="user-management__confirm-head">
                    <span className="user-management__confirm-icon" aria-hidden="true">
                        <HiExclamation size={18} />
                    </span>
                    <h3>{deleteTarget.title}</h3>
                </div>
                <p className="user-management__confirm-text">{deleteTarget.message}</p>
                <div className="user-management__confirm-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={onConfirm}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
