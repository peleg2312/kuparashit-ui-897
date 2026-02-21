import { HiCheckCircle, HiRefresh, HiX } from 'react-icons/hi';
import { formatResponse } from '@/utils/mdsBuilderUtils';

export default function MdsBuilderModal({
    isOpen,
    modalStep,
    summaryPayload,
    responsePayload,
    onClose,
    onExecute,
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content mds-modal" onClick={(event) => event.stopPropagation()}>
                {modalStep === 'summary' && (
                    <>
                        <div className="modal-header">
                            <h2 className="modal-title">Configuration Summary</h2>
                            <button type="button" className="btn-icon" onClick={onClose}>
                                <HiX size={16} />
                            </button>
                        </div>
                        <div className="mds-modal__body">
                            <pre>{formatResponse(summaryPayload)}</pre>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={onExecute}>Execute</button>
                        </div>
                    </>
                )}

                {modalStep === 'loading' && (
                    <div className="mds-loading">
                        <span className="mds-loading__spinner"><HiRefresh size={22} className="animate-spin" /></span>
                        <h3>Executing MDS Builder</h3>
                        <p>Sending configuration and waiting for backend response...</p>
                    </div>
                )}

                {modalStep === 'result' && (
                    <>
                        <div className="modal-header">
                            <h2 className="modal-title">Execution Result</h2>
                            <button type="button" className="btn-icon" onClick={onClose}>
                                <HiX size={16} />
                            </button>
                        </div>
                        <div className="mds-result-banner">
                            <HiCheckCircle size={18} />
                            Request completed successfully.
                        </div>
                        <div className="mds-modal__body">
                            <pre>{formatResponse(responsePayload)}</pre>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
