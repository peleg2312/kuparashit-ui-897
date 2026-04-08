import { HiCheck, HiChevronDown } from 'react-icons/hi';
import { normalizeOptions } from '@/utils/csiWalletsUtils';

export default function CsiSelectField({
    fieldKey,
    label,
    value,
    options,
    placeholder,
    isOpen,
    disabled,
    hint,
    onChange,
    onOpenChange,
    registerRef,
}) {
    const normalizedOptions = normalizeOptions(options);
    const selectedLabel = value || '';

    return (
        <label className="csi-wallets__field">
            <span>{label}</span>
            <div className="csi-select" ref={(node) => registerRef(fieldKey, node)}>
                <button
                    type="button"
                    className={`csi-select-trigger ${isOpen ? 'is-open' : ''}`}
                    disabled={disabled}
                    onClick={() => onOpenChange(!isOpen)}
                >
                    <span className={selectedLabel ? 'csi-select-value' : 'csi-select-placeholder'}>
                        {selectedLabel || placeholder}
                    </span>
                    <HiChevronDown size={17} className={`csi-select-chevron ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen ? (
                    <div className="csi-select-menu glass-card animate-slide-down">
                        <div className="csi-select-options">
                            {normalizedOptions.length ? normalizedOptions.map((option) => {
                                const isSelected = option === value;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        className={`csi-select-option ${isSelected ? 'is-selected' : ''}`}
                                        onClick={() => {
                                            onChange(option);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <span className={`csi-select-option-check ${isSelected ? 'is-selected' : ''}`}>
                                            {isSelected ? <HiCheck size={13} /> : null}
                                        </span>
                                        <span className="csi-select-option-label">{option}</span>
                                    </button>
                                );
                            }) : (
                                <div className="csi-select-empty">No matching items</div>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
            {hint ? <small>{hint}</small> : null}
        </label>
    );
}
