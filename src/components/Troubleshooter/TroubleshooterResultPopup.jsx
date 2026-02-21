import { HiX } from 'react-icons/hi';

export default function TroubleshooterResultPopup({ title, result, color, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ts-result-modal animate-scale" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{title}</h2>
                        <p className="page-subtitle">Troubleshooter response JSON</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="ts-result-modal__body" style={{ borderColor: color }}>
                    <pre>{result}</pre>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" style={{ background: color }} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
