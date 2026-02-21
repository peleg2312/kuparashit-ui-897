import { useMemo, useState } from 'react';
import { HiSearch, HiX } from 'react-icons/hi';
import HerziResultView from './HerziResultView';

export default function HerziMultiResultPopup({
    title,
    items,
    resultsByItem,
    responseUrlsByItem,
    queryUrl,
    onClose,
    onCopyResult,
    onCopyList,
}) {
    const [selectedItem, setSelectedItem] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const trimmedSearchValue = searchValue.trim();
    const hasActiveSearch = trimmedSearchValue.length > 0;

    const filteredItems = useMemo(() => {
        const term = trimmedSearchValue.toLowerCase();
        if (!term) return items;
        return items.filter((item) => item.toLowerCase().includes(term));
    }, [items, trimmedSearchValue]);

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
            <div className="modal-content herzi-result-modal herzi-result-modal--multi animate-scale" onClick={(event) => event.stopPropagation()}>
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
                            <div className="herzi-result-side-head">
                                <div className="herzi-result-list-intro">Choose item</div>
                                <span className="herzi-result-count-chip">{filteredItems.length} / {items.length}</span>
                            </div>
                            <div className="herzi-result-search-wrap">
                                <HiSearch size={14} className="herzi-result-search-icon" />
                                <input
                                    className="herzi-result-search"
                                    placeholder="Search item name..."
                                    value={searchValue}
                                    onChange={(event) => setSearchValue(event.target.value)}
                                    aria-label="Search result items"
                                />
                                {hasActiveSearch && (
                                    <button
                                        type="button"
                                        className="herzi-result-search-clear"
                                        aria-label="Clear search"
                                        onClick={() => setSearchValue('')}
                                    >
                                        <HiX size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="herzi-result-search-state">
                                {hasActiveSearch
                                    ? `${filteredItems.length} matches for "${trimmedSearchValue}"`
                                    : 'Type to filter by item name'}
                            </div>
                            <div className="herzi-result-items">
                                {filteredItems.map((item, index) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`herzi-result-item-btn ${activeItem === item ? 'herzi-result-item-btn--active' : ''}`}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <span className="herzi-result-item-index">{index + 1}</span>
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
                                <div className="herzi-result-selected-label">
                                    {activeItem ? `Viewing: ${activeItem}` : 'No item selected'}
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary herzi-copy-btn"
                                    disabled={!activeItem}
                                    onClick={() => onCopyResult(resultsByItem[activeItem] || '', `Copied result for ${activeItem}`)}
                                >
                                    Copy
                                </button>
                            </div>
                            <div className="herzi-result-body">
                                {activeItem ? (
                                    <HerziResultView
                                        value={resultsByItem[activeItem] || ''}
                                        responseUrl={responseUrlsByItem?.[activeItem] || queryUrl || ''}
                                    />
                                ) : (
                                    <div className="herzi-result-placeholder">
                                        No item matches the current search.
                                    </div>
                                )}
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
