export default function TroubleshooterChoiceField({
    label,
    searchValue,
    onSearchChange,
    options,
    filteredOptions,
    selectedValue,
    onSelectOption,
    loadingOptions,
    searchPlaceholder,
    emptyAllText,
    emptyFilteredText,
    optionMetaLabel,
}) {
    return (
        <div className="ts-field ts-input-block">
            <label className="ts-label">{label}</label>
            <div className="ts-choice-toolbar">
                <input
                    type="text"
                    className="input-field ts-choice-search"
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                    disabled={loadingOptions || !options.length}
                />
                <span className="ts-choice-count">
                    {filteredOptions.length}/{options.length}
                </span>
            </div>
            {options.length ? (
                filteredOptions.length ? (
                    <div className="ts-choice-scroll">
                        <div className="ts-choice-grid">
                            {filteredOptions.map((value) => {
                                const selected = selectedValue === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`ts-choice-card ${selected ? 'ts-choice-card--active' : ''}`}
                                        onClick={() => onSelectOption(value)}
                                    >
                                        <span className="ts-choice-card__title">{value}</span>
                                        <span className="ts-choice-card__meta">{optionMetaLabel}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="ts-empty-state">{emptyFilteredText}</div>
                )
            ) : (
                <div className="ts-empty-state">{emptyAllText}</div>
            )}
        </div>
    );
}
