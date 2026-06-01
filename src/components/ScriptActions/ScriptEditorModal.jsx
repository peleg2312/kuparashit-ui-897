import { useEffect, useState } from 'react';
import { HiExclamationCircle, HiPlus, HiX } from 'react-icons/hi';
import ScriptEditorTopFields from './ScriptEditorTopFields';
import ScriptEditorFieldRow from './ScriptEditorFieldRow';
import ScriptEditorFooter from './ScriptEditorFooter';
import {
    blankField,
    buildInitialState,
    buildPayload,
    validate,
} from './scriptEditorHelpers';
import '@/components/ActionModal/ActionModal.css';

export default function ScriptEditorModal({ script, onClose, onSave, onDelete }) {
    const mode = script ? 'edit' : 'create';
    const [state, setState] = useState(() => buildInitialState(script));
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setState(buildInitialState(script));
        setErrors({});
        setSubmitError('');
    }, [script]);

    const handleTopChange = (key, value) => {
        setState((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const handleFieldChange = (index, key, value) => {
        setState((prev) => {
            const next = [...prev.fields];
            next[index] = { ...next[index], [key]: value };
            return { ...prev, fields: next };
        });
    };

    const addFieldRow = () =>
        setState((prev) => ({ ...prev, fields: [...prev.fields, blankField()] }));

    const removeFieldRow = (index) =>
        setState((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));

    const handleSave = async () => {
        const nextErrors = validate(state, mode);
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        setSubmitError('');
        setSubmitting(true);
        try {
            await onSave(buildPayload(state), mode);
        } catch (error) {
            const msg = error?.cause?.response?.data?.detail || error?.message || 'Save failed.';
            setSubmitError(String(msg));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete || !script) return;
        setSubmitting(true);
        try {
            await onDelete(script.id);
        } catch (error) {
            const msg = error?.cause?.response?.data?.detail || error?.message || 'Delete failed.';
            setSubmitError(String(msg));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content action-modal script-editor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header script-modal-header">
                    <div className="script-modal-header__text">
                        <h2 className="modal-title">{mode === 'create' ? 'Add New Script' : 'Edit Script'}</h2>
                        <p className="action-modal__subtitle">
                            Define the request, method, and required fields.
                        </p>
                    </div>
                    <button className="btn-icon script-modal-close" onClick={onClose} aria-label="Close">
                        <HiX size={18} />
                    </button>
                </div>

                <div className="modal-body script-editor-body">
                    <ScriptEditorTopFields
                        state={state}
                        errors={errors}
                        mode={mode}
                        onChange={handleTopChange}
                    />

                    <div className="script-editor-fields-header">
                        <h3>Required Fields</h3>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addFieldRow}>
                            <HiPlus size={14} /> Add Field
                        </button>
                    </div>

                    {state.fields.length === 0 && (
                        <p className="script-editor-empty">No fields. Add one to collect user input.</p>
                    )}

                    {state.fields.map((field, index) => (
                        <ScriptEditorFieldRow
                            key={index}
                            field={field}
                            index={index}
                            errors={errors.fields?.[index]}
                            onChange={handleFieldChange}
                            onRemove={removeFieldRow}
                        />
                    ))}

                    {submitError && (
                        <span className="field-error">
                            <HiExclamationCircle size={14} />
                            {submitError}
                        </span>
                    )}
                </div>

                <ScriptEditorFooter
                    mode={mode}
                    submitting={submitting}
                    onClose={onClose}
                    onSave={handleSave}
                    onDelete={onDelete ? handleDelete : undefined}
                />
            </div>
        </div>
    );
}
