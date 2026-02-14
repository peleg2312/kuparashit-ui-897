import { useEffect, useMemo, useRef, useState } from 'react';
import { herziCategories, getBoxesByCategory } from '../config/herziBoxes';
import { herziApi } from '../api';
import { HiLightningBolt, HiSearch, HiX } from 'react-icons/hi';
import { formatHerziToolResult, parseHerziInputList } from '../utils/herziHandlers';
import Toast from '../components/Toast/Toast';
import { copyListToClipboard, copyTextToClipboard } from '../utils/clipboardHandlers';
import './HerziToolsPage.css';

function SingleResultPopup({ title, item, result, onClose, onCopy }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content herzi-result-modal animate-scale" onClick={(e) => e.stopPropagation()}>
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
                    <pre>{result}</pre>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => onCopy(result, `Copied result for ${item || title}`)}>Copy</button>
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function MultiResultPopup({ title, items, resultsByItem, onClose, onCopyResult, onCopyList }) {
    const [selectedItem, setSelectedItem] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const filteredItems = useMemo(() => {
        const term = searchValue.trim().toLowerCase();
        if (!term) return items;
        return items.filter((item) => item.toLowerCase().includes(term));
    }, [items, searchValue]);
    const activeItem = useMemo(() => {
        if (selectedItem && filteredItems.includes(selectedItem)) return selectedItem;
        return filteredItems[0] || '';
    }, [filteredItems, selectedItem]);

    const simpleResultList = useMemo(() => {
        const values = items.map((item) => String(resultsByItem[item] || '').trim());
        if (!values.length) return [];
        const hasComplexValue = values.some((value) => !value || value.includes('\n'));
        return hasComplexValue ? [] : values;
    }, [items, resultsByItem]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content herzi-result-modal herzi-result-modal--multi animate-scale" onClick={(e) => e.stopPropagation()}>
                <div className="herzi-result-header">
                    <div>
                        <h3>{title}</h3>
                        <p className="herzi-result-subtitle">{items.length} items were submitted</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={22} />
                    </button>
                </div>

                {simpleResultList.length ? (
                    <div className="herzi-simple-list-view">
                        <div className="herzi-simple-list-head">
                            <div className="herzi-result-list-intro">Result list</div>
                            <button
                                type="button"
                                className="btn btn-secondary herzi-copy-btn"
                                onClick={() => onCopyList(simpleResultList)}
                            >
                                Copy all
                            </button>
                        </div>
                        <div className="herzi-simple-list-results">
                            {simpleResultList.map((value, index) => (
                                <div key={`${value}-${index}`} className="herzi-simple-list-row">
                                    <code className="herzi-simple-list-value">{value}</code>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="herzi-result-layout">
                        <aside className="herzi-result-side">
                            <div className="herzi-result-list-intro">Choose item</div>
                            <div className="herzi-result-search-wrap">
                                <HiSearch size={14} />
                                <input
                                    className="herzi-result-search"
                                    placeholder="Search item"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                            </div>
                            <div className="herzi-result-items">
                                {filteredItems.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`herzi-result-item-btn ${activeItem === item ? 'herzi-result-item-btn--active' : ''}`}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <span className="herzi-result-item-name">{item}</span>
                                    </button>
                                ))}
                                {!filteredItems.length && (
                                    <div className="herzi-result-empty">No matching items</div>
                                )}
                            </div>
                        </aside>
                        <section className="herzi-result-detail-view">
                            <div className="herzi-result-detail-head">
                                <div className="herzi-result-selected-label">Viewing: {activeItem}</div>
                                <button
                                    type="button"
                                    className="btn btn-secondary herzi-copy-btn"
                                    onClick={() => onCopyResult(resultsByItem[activeItem] || '', `Copied result for ${activeItem}`)}
                                >
                                    Copy
                                </button>
                            </div>
                            <div className="herzi-result-body">
                                <pre>{resultsByItem[activeItem] || 'No result available.'}</pre>
                            </div>
                        </section>
                    </div>
                )}

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function buildMultiResultState(inputItems, response) {
    const resultsByItem = {};
    const orderedItems = [];

    if (Array.isArray(response)) {
        response.forEach((entry, index) => {
            const fallbackItem = inputItems[index] || '';
            const isObjectEntry = typeof entry === 'object' && entry !== null && !Array.isArray(entry);
            const rawItem = isObjectEntry ? (entry.item ?? entry.input ?? fallbackItem) : fallbackItem;
            const item = String(rawItem || '').trim();
            if (!item || resultsByItem[item]) return;

            const rawResult = isObjectEntry && 'result' in entry ? entry.result : entry;
            resultsByItem[item] = formatHerziToolResult(rawResult);
            orderedItems.push(item);
        });
    }

    if (!orderedItems.length) {
        const fallbackResult = formatHerziToolResult(response);
        inputItems.forEach((item) => {
            resultsByItem[item] = fallbackResult;
        });
        return { items: inputItems, resultsByItem };
    }

    inputItems.forEach((item) => {
        if (!(item in resultsByItem)) {
            resultsByItem[item] = 'No result returned for this item.';
            orderedItems.push(item);
        }
    });

    return { items: orderedItems, resultsByItem };
}

function DynamicBox({ box }) {
    const [input, setInput] = useState('');
    const [resultState, setResultState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState('success');
    const toastTimerRef = useRef(null);

    const closeResult = () => setResultState(null);

    useEffect(() => () => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    }, []);

    const showToast = (message, type = 'success') => {
        setToast(message);
        setToastType(type);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(''), 2400);
    };

    const handleCopyResult = async (value, successMessage = 'Copied result') => {
        try {
            const copied = await copyTextToClipboard(String(value || '').trim());
            if (!copied) {
                showToast('Nothing to copy', 'error');
                return;
            }
            showToast(successMessage, 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    const handleCopyList = async (list) => {
        try {
            const result = await copyListToClipboard(list);
            if (!result.copied) {
                showToast('Nothing to copy', 'error');
                return;
            }
            showToast(`Copied ${result.count} results`, 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    const handleSubmit = async () => {
        const inputItems = parseHerziInputList(input);
        if (!inputItems.length) return;

        setLoading(true);

        try {
            if (inputItems.length === 1) {
                const singleItem = inputItems[0];
                const response = await herziApi.query(box.endpoint, singleItem);
                setResultState({
                    mode: 'single',
                    item: singleItem,
                    result: formatHerziToolResult(response),
                });
                return;
            }

            const response = await herziApi.query(box.endpoint, inputItems);
            const { items, resultsByItem } = buildMultiResultState(inputItems, response);

            setResultState({
                mode: 'multi',
                items,
                resultsByItem,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="herzi-box glass-card">
                <div className="herzi-box__icon-wrapper">
                    <HiLightningBolt size={28} />
                </div>
                <div className="herzi-box__content">
                    <h3 className="herzi-box__title">{box.title}</h3>
                    <div className="herzi-box__cats">
                        {box.categories.map((category) => (
                            <span key={category} className="badge badge-accent small-badge">{category}</span>
                        ))}
                    </div>
                    <div className="herzi-box__input-area">
                        <textarea
                            className="herzi-input herzi-input--textarea"
                            placeholder={box.inputLabel}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    handleSubmit();
                                }
                            }}
                            rows={2}
                        />
                        <button
                            className="btn-primary herzi-submit-btn"
                            onClick={handleSubmit}
                            disabled={loading}
                            title="Run Tool"
                        >
                            {loading ? <span className="animate-spin">...</span> : <HiSearch size={18} />}
                        </button>
                    </div>
                </div>
            </div>
            {resultState?.mode === 'single' && (
                <SingleResultPopup
                    title={box.title}
                    item={resultState.item}
                    result={resultState.result}
                    onClose={closeResult}
                    onCopy={handleCopyResult}
                />
            )}
            {resultState?.mode === 'multi' && (
                <MultiResultPopup
                    title={box.title}
                    items={resultState.items}
                    resultsByItem={resultState.resultsByItem}
                    onClose={closeResult}
                    onCopyResult={handleCopyResult}
                    onCopyList={handleCopyList}
                />
            )}
            <Toast message={toast} type={toastType} onClose={() => setToast('')} />
        </>
    );
}

export default function HerziToolsPage() {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const boxes = getBoxesByCategory(activeCategory);

    return (
        <div className="page-container">
            <div className="page-header centered-header">
                <div>
                    <h1 className="page-title">Herzi Tools</h1>
                    <p className="page-subtitle">Dynamic tools by category with long-form popup results</p>
                </div>
            </div>

            <div className="page-content">
                <div className="herzi-categories-wrapper">
                    <div className="herzi-categories">
                        {herziCategories.map((category) => (
                            <button
                                key={category}
                                className={`herzi-cat-btn ${activeCategory === category ? 'herzi-cat-btn--active' : ''}`}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="herzi-grid">
                    {boxes.map((box) => (
                        <DynamicBox key={box.id} box={box} />
                    ))}
                </div>
            </div>
        </div>
    );
}
