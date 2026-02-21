import { HiRefresh, HiSearch } from 'react-icons/hi';
import Toast from '@/components/Toast/Toast';
import { fallbackCategoryIcon, categoryIconMap } from '@/config/herziCategoryIcons';
import { useHerziBoxState } from '@/hooks/useHerziBoxState';
import HerziBoxLoadingPopup from './HerziBoxLoadingPopup';
import HerziMultiResultPopup from './HerziMultiResultPopup';
import HerziSingleResultPopup from './HerziSingleResultPopup';

export default function HerziDynamicBox({ box }) {
    const { state, toast, actions } = useHerziBoxState(box);

    const PrimaryIcon = categoryIconMap[box.categories?.[0]] || fallbackCategoryIcon;

    return (
        <>
            <div className={`herzi-box glass-card ${state.loading ? 'herzi-box--loading' : ''}`} aria-busy={state.loading}>
                <div className="herzi-box__content">
                    <div className="herzi-box__head">
                        <span className="herzi-box__icon" aria-hidden="true">
                            <PrimaryIcon size={17} />
                        </span>
                        <div className="herzi-box__title-wrap">
                            <h3 className="herzi-box__title">{box.title}</h3>
                            <p className="herzi-box__subtitle">{box.inputLabel} input</p>
                        </div>
                    </div>
                    <div className="herzi-box__cats">
                        {box.categories.map((category) => (
                            <span key={category} className="badge badge-accent small-badge">{category}</span>
                        ))}
                    </div>
                    <div className="herzi-box__input-area">
                        <textarea
                            className="herzi-input herzi-input--textarea"
                            placeholder={state.inputPlaceholder}
                            value={state.input}
                            disabled={state.loading}
                            onChange={(event) => actions.setInput(event.target.value)}
                            onKeyDown={(event) => {
                                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                                    actions.handleSubmit();
                                }
                            }}
                            rows={2}
                        />
                        <button
                            className="btn-primary herzi-submit-btn"
                            onClick={actions.handleSubmit}
                            disabled={state.loading}
                            title={state.loading ? 'Running query' : 'Run Tool'}
                        >
                            {state.loading ? (
                                <>
                                    <HiRefresh size={15} className="animate-spin" />
                                    Running
                                </>
                            ) : (
                                <>
                                    Run <HiSearch size={15} />
                                </>
                            )}
                        </button>
                    </div>
                    <p className={`herzi-box__hint ${state.loading ? 'herzi-box__hint--loading' : ''}`} aria-live="polite">
                        {state.loading ? 'Fetching result...' : 'Tip: press Ctrl+Enter to run quickly'}
                    </p>
                </div>
                {state.loading && <HerziBoxLoadingPopup title={box.title} />}
            </div>
            {state.resultState?.mode === 'single' && (
                <HerziSingleResultPopup
                    title={box.title}
                    item={state.resultState.item}
                    result={state.resultState.result}
                    responseUrl={state.resultState.responseUrl}
                    onClose={actions.closeResult}
                    onCopy={actions.handleCopyResult}
                />
            )}
            {state.resultState?.mode === 'multi' && (
                <HerziMultiResultPopup
                    title={box.title}
                    items={state.resultState.items}
                    resultsByItem={state.resultState.resultsByItem}
                    responseUrlsByItem={state.resultState.responseUrlsByItem}
                    queryUrl={state.resultState.queryUrl}
                    onClose={actions.closeResult}
                    onCopyResult={actions.handleCopyResult}
                    onCopyList={actions.handleCopyList}
                />
            )}
            <Toast message={toast.message} type={toast.type} onClose={toast.hide} />
        </>
    );
}
