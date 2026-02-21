import { HiCheck, HiChevronDown, HiSearch } from 'react-icons/hi';

function isEmptyValue(value) {
    return value === undefined
        || value === null
        || value === ''
        || (Array.isArray(value) && value.length === 0);
}

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeOptions(options = []) {
    const list = Array.isArray(options) ? options : [];
    return list
        .map((option) => {
            if (option && typeof option === 'object') {
                const value = option.value ?? option.label;
                const label = option.label ?? option.value;
                return {
                    value: String(value ?? ''),
                    label: String(label ?? value ?? ''),
                };
            }
            const text = String(option ?? '');
            return { value: text, label: text };
        })
        .filter((option) => option.value);
}

function uniqueValues(values) {
    return [...new Set(values.filter((value) => !isEmptyValue(value)))];
}

export default function ActionModalSelectField({
    param,
    values,
    value,
    rawOptions,
    isOpen,
    searchTerm,
    menuLayout,
    onChange,
    onOpenChange,
    onSearchChange,
    registerRef,
}) {
    const options = normalizeOptions(rawOptions || []);
    const dependencies = asArray(param.dependsOn);
    const hasMissingDependency = dependencies.some((dependencyName) => isEmptyValue(values?.[dependencyName]));
    const searchQuery = searchTerm.trim().toLowerCase();
    const filteredOptions = searchQuery
        ? options.filter((option) => option.label.toLowerCase().includes(searchQuery))
        : options;
    const selectedValue = value ?? (param.multi ? [] : '');
    const selectedList = param.multi
        ? (Array.isArray(selectedValue) ? selectedValue.map((item) => String(item)) : [])
        : [];
    const selectedLabelByValue = new Map(options.map((option) => [option.value, option.label]));
    const selectedLabels = param.multi
        ? selectedList.map((selected) => selectedLabelByValue.get(selected) || selected)
        : (selectedValue ? [selectedLabelByValue.get(String(selectedValue)) || String(selectedValue)] : []);
    const selectedText = selectedLabels.join(', ');

    const toggleOption = (optionValue) => {
        if (param.multi) {
            const nextValues = selectedList.includes(optionValue)
                ? selectedList.filter((selected) => selected !== optionValue)
                : [...selectedList, optionValue];
            onChange(nextValues);
            return;
        }
        onChange(optionValue);
        onOpenChange(false);
    };

    const selectAllFiltered = () => {
        const allFiltered = filteredOptions.map((option) => option.value);
        onChange(uniqueValues([...selectedList, ...allFiltered]));
    };

    const clearSelection = () => {
        onChange(param.multi ? [] : '');
    };

    const openMenu = () => {
        if (hasMissingDependency) return;
        onOpenChange(!isOpen);
    };

    const placeholder = hasMissingDependency
        ? 'Select required fields first...'
        : `Select ${param.label}...`;

    return (
        <div className="am-select" ref={(node) => registerRef(node)}>
            <button
                type="button"
                className={`am-select-trigger ${isOpen ? 'is-open' : ''}`}
                disabled={hasMissingDependency}
                onClick={openMenu}
            >
                <span className={selectedLabels.length ? 'am-select-value am-select-value--truncate' : 'am-select-placeholder'}>
                    {param.multi ? (selectedText || placeholder) : (selectedLabels[0] || placeholder)}
                </span>
                {param.multi && selectedLabels.length > 1 && (
                    <span className="am-select-count">{selectedLabels.length}</span>
                )}
                <HiChevronDown size={18} className={`am-select-chevron ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <input type="hidden" value={param.multi ? selectedList.join(',') : String(selectedValue || '')} readOnly />

            {isOpen && (
                <div
                    className="am-select-menu glass-card"
                    style={{
                        top: menuLayout?.top,
                        left: menuLayout?.left,
                        width: menuLayout?.width,
                        '--am-menu-max-height': `${menuLayout?.maxHeight || 320}px`,
                    }}
                >
                    <div className="am-select-search">
                        <HiSearch size={16} />
                        <input
                            className="am-select-search-input"
                            value={searchTerm}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder={`Search ${param.label.toLowerCase()}...`}
                            autoFocus
                        />
                    </div>

                    {param.multi && (
                        <div className="am-select-actions">
                            <button type="button" className="btn btn-secondary am-select-action-btn" onClick={selectAllFiltered}>
                                Select Filtered
                            </button>
                            <button type="button" className="btn btn-ghost am-select-action-btn" onClick={clearSelection}>
                                Clear
                            </button>
                        </div>
                    )}

                    <div className="am-select-options">
                        {filteredOptions.length === 0 ? (
                            <div className="am-select-empty">No matching items</div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = param.multi
                                    ? selectedList.includes(option.value)
                                    : String(selectedValue) === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`am-select-option ${isSelected ? 'is-selected' : ''}`}
                                        onClick={() => toggleOption(option.value)}
                                    >
                                        <span className={`am-select-option-check ${isSelected ? 'is-selected' : ''}`}>
                                            {isSelected && <HiCheck size={14} />}
                                        </span>
                                        <span className="am-select-option-label">{option.label}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
