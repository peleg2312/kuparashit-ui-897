import { HiCheckCircle, HiExclamationCircle, HiX } from 'react-icons/hi';

export default function ScriptResultPopup({ result, onClose }) {
    if (!result) return null;

    const isSuccess = result.type === 'success';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content script-result-popup" onClick={(e) => e.stopPropagation()}>
                <div className={`script-result-popup__banner ${isSuccess ? 'is-success' : 'is-error'}`}>
                    <div className="script-result-popup__icon">
                        {isSuccess ? <HiCheckCircle size={22} /> : <HiExclamationCircle size={22} />}
                    </div>
                    <div>
                        <p className="script-result-popup__eyebrow">
                            {isSuccess ? 'Executed successfully' : 'Execution failed'}
                        </p>
                        <h2>{result.label}</h2>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="script-result-popup__body">
                    {result.jobId && (
                        <div className="script-result-popup__meta">
                            <span className="badge">{result.jobId}</span>
                        </div>
                    )}
                    <p className="script-result-popup__message">{result.message}</p>

                    {!isSuccess && result.detail && (
                        <div className="script-result-popup__detail">
                            <span>Detail</span>
                            <pre>{result.detail}</pre>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className={`btn ${isSuccess ? 'btn-success' : 'btn-danger'}`}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
