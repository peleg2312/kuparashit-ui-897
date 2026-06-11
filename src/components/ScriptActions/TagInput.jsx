import { useState } from 'react';
import { HiX } from 'react-icons/hi';

/**
 * Chip-style input for arrays of primitives (strings or numbers).
 *
 * Props:
 *   value      — current array of items (strings or numbers)
 *   onChange   — (newArray) => void
 *   itemType   — 'text' | 'number' (controls coercion + input type)
 *   placeholder
 *
 * Behavior:
 *   - User types into the input; Enter / Tab / comma commits the chip
 *   - Backspace on an empty input removes the last chip
 *   - X on a chip removes that chip
 *   - Pasting a comma-separated string splits into multiple chips
 */
export default function TagInput({ value = [], onChange, itemType = 'text', placeholder }) {
    const [draft, setDraft] = useState('');

    const items = Array.isArray(value) ? value : [];

    const coerce = (raw) => {
        const s = String(raw).trim();
        if (!s) return null;
        if (itemType === 'number') {
            const n = Number(s);
            return Number.isFinite(n) ? n : null;
        }
        return s;
    };

    const commitDraft = () => {
        const next = coerce(draft);
        if (next === null) {
            setDraft('');
            return;
        }
        // de-dupe strings, allow dup numbers (rare but cheap)
        if (itemType === 'text' && items.includes(next)) {
            setDraft('');
            return;
        }
        onChange([...items, next]);
        setDraft('');
    };

    const removeAt = (index) => {
        const next = items.filter((_, i) => i !== index);
        onChange(next);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
            if (draft.trim()) {
                e.preventDefault();
                commitDraft();
            }
            return;
        }
        if (e.key === 'Backspace' && draft === '' && items.length > 0) {
            e.preventDefault();
            removeAt(items.length - 1);
        }
    };

    const handlePaste = (e) => {
        const text = e.clipboardData.getData('text');
        if (!text.includes(',')) return; // fall through to default paste
        e.preventDefault();
        const pieces = text.split(',').map((s) => s.trim()).filter(Boolean);
        const coerced = pieces.map(coerce).filter((v) => v !== null);
        if (coerced.length === 0) return;
        const merged = itemType === 'text'
            ? [...items, ...coerced.filter((v) => !items.includes(v))]
            : [...items, ...coerced];
        onChange(merged);
    };

    return (
        <div className="tag-input" onClick={(e) => {
            // clicking the wrapper focuses the input
            if (e.target.classList.contains('tag-input')) {
                e.currentTarget.querySelector('input')?.focus();
            }
        }}>
            {items.map((item, idx) => (
                <span key={idx} className="tag-input__chip">
                    {String(item)}
                    <button
                        type="button"
                        className="tag-input__chip-remove"
                        onClick={() => removeAt(idx)}
                        aria-label={`Remove ${item}`}
                    >
                        <HiX size={12} />
                    </button>
                </span>
            ))}
            <input
                className="tag-input__input"
                type={itemType === 'number' ? 'number' : 'text'}
                value={draft}
                placeholder={items.length === 0 ? (placeholder || 'Type and press Enter...') : ''}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => { if (draft.trim()) commitDraft(); }}
            />
        </div>
    );
}
