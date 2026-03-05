import { useMemo, useState } from 'react';
import { HiChevronDown, HiChevronUp, HiX } from 'react-icons/hi';
import { formatJsonOutput } from '@/utils/troubleshooterUtils';

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function formatFieldLabel(fieldKey) {
    const normalized = String(fieldKey || '').trim();
    if (!normalized) return 'Value';
    return normalized
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isPrimitive(value) {
    return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function normalizeSectionItems(value) {
    if (Array.isArray(value)) {
        const primitiveArray = value.every(isPrimitive);
        if (!primitiveArray) {
            return [{ text: formatJsonOutput(value), isJson: true }];
        }
        return value
            .map((item) => String(item ?? '').trim())
            .filter(Boolean)
            .map((item) => ({ text: item, isJson: false }));
    }

    if (isPlainObject(value)) {
        return [{ text: formatJsonOutput(value), isJson: true }];
    }

    const textValue = String(value ?? '').trim();
    return textValue ? [{ text: textValue, isJson: false }] : [];
}

function splitReadableLines(text) {
    return String(text || '')
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean);
}

function parseKeyValueLine(line) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex > 32) return null;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) return null;
    return { key, value };
}

function ReadableTextBlock({ text }) {
    const lines = splitReadableLines(text);
    if (!lines.length) return null;

    const [mainLine, ...detailLines] = lines;
    return (
        <div className="ts-result-text-block">
            <div className="ts-result-text-main">{mainLine}</div>
            {!!detailLines.length && (
                <div className="ts-result-text-details">
                    {detailLines.map((line, index) => {
                        const keyValue = parseKeyValueLine(line);
                        if (keyValue) {
                            return (
                                <div key={`${line}-${index}`} className="ts-result-text-detail">
                                    <span className="ts-result-text-key">{keyValue.key}:</span>
                                    <span className="ts-result-text-value">{keyValue.value}</span>
                                </div>
                            );
                        }
                        return (
                            <div key={`${line}-${index}`} className="ts-result-text-detail">
                                <span className="ts-result-text-value">{line}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function isStructuredTroubleshooterResult(value) {
    if (!isPlainObject(value)) return false;
    const entries = Object.entries(value);
    if (!entries.length) return false;
    return entries.every(([key, itemValue]) => String(key || '').trim() && isPlainObject(itemValue));
}

function buildSections(payload) {
    const problemsItems = normalizeSectionItems(payload.problems);
    const sections = [
        {
            key: 'problems',
            label: 'Problems Found',
            isProblem: true,
            items: problemsItems,
        },
    ];

    Object.entries(payload)
        .filter(([key]) => key !== 'problems')
        .forEach(([key, value]) => {
            sections.push({
                key,
                label: formatFieldLabel(key),
                isProblem: false,
                items: normalizeSectionItems(value),
            });
        });

    return sections;
}

export default function TroubleshooterResultPopup({ title, result, color, onClose }) {
    const [collapsedSections, setCollapsedSections] = useState({});

    const structuredEntries = useMemo(() => {
        if (!isStructuredTroubleshooterResult(result)) return [];

        return Object.entries(result).map(([troubleKey, payload]) => ({
            troubleKey,
            sections: buildSections(payload),
        }));
    }, [result]);

    const getSectionStateKey = (troubleKey, sectionKey) => `${troubleKey}::${sectionKey}`;
    const isSectionCollapsed = (troubleKey, section) => {
        const stateKey = getSectionStateKey(troubleKey, section.key);
        if (Object.prototype.hasOwnProperty.call(collapsedSections, stateKey)) {
            return !!collapsedSections[stateKey];
        }
        return !section.isProblem;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ts-result-modal animate-scale" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{title}</h2>
                        <p className="page-subtitle">Troubleshooter findings</p>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="ts-result-modal__body" style={{ borderColor: color, '--ts-accent': color }}>
                    {structuredEntries.length ? (
                        <div className="ts-result-entries">
                            {structuredEntries.map(({ troubleKey, sections }) => {
                                const problemSection = sections.find((section) => section.isProblem);
                                const problemsCount = problemSection?.items?.length || 0;
                                const hasCollapsedSections = sections.some((section) => isSectionCollapsed(troubleKey, section));
                                return (
                                    <article key={troubleKey} className="ts-result-entry">
                                        <div className="ts-result-entry__input">
                                            <span className="ts-result-entry__input-label">Input</span>
                                            <code className="ts-result-entry__input-value">{troubleKey}</code>
                                        </div>

                                        <div className="ts-result-entry__header">
                                            <span className={`ts-result-entry__meta ${problemsCount ? 'ts-result-entry__meta--problem' : ''}`}>
                                                {problemsCount ? `${problemsCount} problem(s) detected` : 'No problems detected'}
                                            </span>
                                            <div className="ts-result-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary ts-result-toggle-btn"
                                                    onClick={() => {
                                                        setCollapsedSections((prev) => {
                                                            const next = { ...prev };
                                                            sections.forEach((section) => {
                                                                next[getSectionStateKey(troubleKey, section.key)] = false;
                                                            });
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    Expand all
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary ts-result-toggle-btn"
                                                    disabled={!hasCollapsedSections}
                                                    onClick={() => {
                                                        setCollapsedSections((prev) => {
                                                            const next = { ...prev };
                                                            sections.forEach((section) => {
                                                                next[getSectionStateKey(troubleKey, section.key)] = true;
                                                            });
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    Collapse all
                                                </button>
                                            </div>
                                        </div>

                                        <div className="ts-result-extra-sections">
                                            {sections.map((section) => {
                                                const sectionCollapsed = isSectionCollapsed(troubleKey, section);
                                                return (
                                                    <section
                                                        key={`${troubleKey}-${section.key}`}
                                                        className={`ts-result-section ${section.isProblem ? 'ts-result-section--problems' : ''}`}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="ts-result-section__toggle"
                                                            onClick={() => {
                                                                const stateKey = getSectionStateKey(troubleKey, section.key);
                                                                setCollapsedSections((prev) => ({
                                                                    ...prev,
                                                                    [stateKey]: !sectionCollapsed,
                                                                }));
                                                            }}
                                                        >
                                                            <div className="ts-result-section__header">
                                                                <h4>{section.label}</h4>
                                                            </div>
                                                            <div className="ts-result-section__toggle-meta">
                                                                <span className="ts-result-section__count">
                                                                    {section.items.length}
                                                                </span>
                                                                {sectionCollapsed ? <HiChevronDown size={16} /> : <HiChevronUp size={16} />}
                                                            </div>
                                                        </button>

                                                        {!sectionCollapsed && (
                                                            <div className="ts-result-lines">
                                                                {section.items.length ? (
                                                                    section.items.map((item, index) => (
                                                                        item.isJson ? (
                                                                            <pre
                                                                                key={`${troubleKey}-${section.key}-${index}`}
                                                                                className="ts-result-json"
                                                                            >
                                                                                {item.text}
                                                                            </pre>
                                                                        ) : (
                                                                            <div
                                                                                key={`${troubleKey}-${section.key}-${index}`}
                                                                                className={`ts-result-line ${section.isProblem ? 'ts-result-line--problem' : ''}`}
                                                                            >
                                                                                <span className="ts-result-line__index">
                                                                                    {index + 1}
                                                                                </span>
                                                                                <div className="ts-result-line__text">
                                                                                    <ReadableTextBlock text={item.text} />
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    ))
                                                                ) : (
                                                                    <div className="ts-result-empty">No data found.</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </section>
                                                );
                                            })}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <pre className="ts-result-fallback-pre">{formatJsonOutput(result)}</pre>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: color, '--btn-primary-glow': color }}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
