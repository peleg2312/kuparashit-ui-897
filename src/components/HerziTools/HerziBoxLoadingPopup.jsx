import { HiRefresh } from 'react-icons/hi';

export default function HerziBoxLoadingPopup({ title }) {
    return (
        <div className="herzi-loading-popup" role="status" aria-live="polite">
            <div className="herzi-loading-popup__card animate-scale">
                <div className="herzi-loading-popup__scanner" aria-hidden="true">
                    <span className="herzi-loading-popup__ring herzi-loading-popup__ring--outer" />
                    <span className="herzi-loading-popup__ring herzi-loading-popup__ring--inner" />
                    <span className="herzi-loading-popup__core">
                        <HiRefresh size={16} className="animate-spin" />
                    </span>
                </div>
                <div className="herzi-loading-popup__copy">
                    <p>Running</p>
                    <span>{title}</span>
                </div>
            </div>
        </div>
    );
}
