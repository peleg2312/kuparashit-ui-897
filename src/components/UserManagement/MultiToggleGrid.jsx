import { useMemo } from 'react';
import { HiCheck } from 'react-icons/hi';

export default function MultiToggleGrid({ options, selectedValues, onToggle, emptyText = 'No options available' }) {
    const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

    if (!options.length) {
        return <div className="user-management__empty-inline">{emptyText}</div>;
    }

    return (
        <div className="user-management__toggle-grid">
            {options.map((item) => {
                const active = selectedSet.has(item.key);
                return (
                    <button
                        key={item.key}
                        type="button"
                        className={`user-management__toggle-chip ${active ? 'user-management__toggle-chip--active' : ''}`}
                        onClick={() => onToggle(item.key)}
                        title={item.description || item.label}
                    >
                        <span className="user-management__toggle-chip-main">{item.label}</span>
                        {item.meta && <span className="user-management__toggle-chip-meta">{item.meta}</span>}
                        {active && <HiCheck size={14} />}
                    </button>
                );
            })}
        </div>
    );
}
