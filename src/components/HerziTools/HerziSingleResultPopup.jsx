import { HiX } from 'react-icons/hi';
import HerziResultView from './HerziResultView';

export default function HerziSingleResultPopup({ title, item, result, responseUrl, onClose, onCopy }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content herzi-result-modal animate-scale" onClick={(event) => event.stopPropagation()}>
                <div className="herzi-result-header">
                    <div>
                        <h3>{title}</h3>
                        {item && <p className="herzi-result-subtitle">Input: {item}</p>}
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={22} />
                    </button>
                </div>
                <div className="herzi-result-body">
                    <HerziResultView value={result} responseUrl={responseUrl} />
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => onCopy(result, `Copied result for ${item || title}`)}>
                        Copy
                    </button>
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
