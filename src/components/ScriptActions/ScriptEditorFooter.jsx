import { useState } from 'react';
import { HiTrash } from 'react-icons/hi';

function DeleteSection({ submitting, onDelete }) {
    const [confirm, setConfirm] = useState(false);

    if (!confirm) {
        return (
            <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirm(true)}
                disabled={submitting}
            >
                <HiTrash size={14} /> Delete
            </button>
        );
    }

    return (
        <div className="script-editor-confirm-delete">
            <span>Delete this script?</span>
            <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={submitting}>
                Yes, delete
            </button>
            <button
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirm(false)}
                disabled={submitting}
            >
                Cancel
            </button>
        </div>
    );
}

export default function ScriptEditorFooter({
    mode,
    submitting,
    onClose,
    onSave,
    onDelete,
}) {
    const showDelete = mode === 'edit' && typeof onDelete === 'function';
    const primaryLabel = submitting
        ? 'Saving...'
        : (mode === 'create' ? 'Create Script' : 'Save Changes');

    return (
        <div className="modal-footer script-editor-footer">
            {showDelete && <DeleteSection submitting={submitting} onDelete={onDelete} />}
            <div className="script-editor-footer__primary">
                <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                    Cancel
                </button>
                <button className="btn btn-primary" onClick={onSave} disabled={submitting}>
                    {primaryLabel}
                </button>
            </div>
        </div>
    );
}
