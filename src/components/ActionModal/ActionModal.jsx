import { HiExclamationCircle, HiX } from 'react-icons/hi';
import { useActionModalState } from '../../hooks/useActionModalState';
import ActionModalField from './ActionModalField';
import './ActionModal.css';

export default function ActionModal({ action, actionKey, screenId, initialValues, onClose, onSubmit }) {
    const { form, dropdown, actions } = useActionModalState({ action, initialValues, onSubmit });

    const useCreateSuccessButton = actionKey === 'create' && (screenId === 'exch' || screenId === 'qtree');

    if (!action) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content action-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{action.label}</h2>
                        <p className="action-modal__subtitle">Fill required parameters and submit</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {form.visibleParams.map((param) => (
                        <ActionModalField
                            key={param.name}
                            param={param}
                            values={form.values}
                            dropdownOptions={dropdown.dropdownOptions}
                            error={form.errors[param.name]}
                            openDropdownName={dropdown.openDropdown}
                            searchByField={dropdown.searchByField}
                            menuLayoutByField={dropdown.menuLayoutByField}
                            onFieldChange={actions.handleChange}
                            onOpenDropdownChange={actions.setOpenDropdown}
                            onSearchChange={actions.setSearchValue}
                            registerDropdownRef={actions.registerDropdownRef}
                        />
                    ))}

                    {form.submitError && (
                        <span className="field-error">
                            <HiExclamationCircle size={14} />
                            {form.submitError}
                        </span>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={form.submitting}>Cancel</button>
                    <button
                        className={`btn ${useCreateSuccessButton ? 'btn-success' : 'btn-primary'}`}
                        onClick={actions.handleSubmit}
                        disabled={form.submitting}
                    >
                        {form.submitting ? 'Processing...' : action.label}
                    </button>
                </div>
            </div>
        </div>
    );
}
