import { HiExclamation, HiX } from 'react-icons/hi';
import './DeleteConfirmationModal.css';

export default function DeleteConfirmationModal({ count, items = [], onConfirm, onClose }) {
    // Focus trap could be added here

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
                <div className="delete-modal__header">
                    <div className="delete-modal__icon">
                        <HiExclamation size={32} />
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={24} />
                    </button>
                </div>

                <h2 className="delete-modal__title">Delete {count} Items?</h2>
                <p className="delete-modal__desc">
                    Are you sure you want to delete the selected items? This action cannot be undone.
                </p>

                <div className="delete-modal__list">
                    {items.slice(0, 8).map((item) => (
                        <div key={item.id} className="delete-modal__item">
                            <span>{item.name || item.id}</span>
                            <span className="badge badge-info">{item.vcenter || item.location || 'N/A'}</span>
                        </div>
                    ))}
                    {items.length > 8 && (
                        <div className="delete-modal__more">+{items.length - 8} more selected</div>
                    )}
                </div>

                <div className="delete-modal__actions">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" onClick={onConfirm}>Delete Forever</button>
                </div>
            </div>
        </div>
    );
}
