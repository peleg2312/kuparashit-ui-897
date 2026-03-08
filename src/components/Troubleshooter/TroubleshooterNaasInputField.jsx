import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiCalendar, HiCheck, HiChevronDown, HiChevronLeft, HiChevronRight, HiClock, HiX } from 'react-icons/hi';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalDateTimeValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeValue(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTimeDisplay(value) {
    const parsed = parseDateTimeValue(value);
    if (!parsed) return 'Pick date and time';
    return parsed.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(dateA, dateB) {
    if (!dateA || !dateB) return false;
    return (
        dateA.getFullYear() === dateB.getFullYear()
        && dateA.getMonth() === dateB.getMonth()
        && dateA.getDate() === dateB.getDate()
    );
}

function buildCalendarDays(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = firstDayOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const nextDate = new Date(gridStart);
        nextDate.setDate(gridStart.getDate() + index);
        return {
            date: nextDate,
            isInMonth: nextDate.getMonth() === month,
        };
    });
}

function dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function TroubleshooterNaasInputField({
    siteOptions,
    siteValue,
    dateTimeValue,
    naasRawValue,
    naasCount,
    parsedNaas,
    onSiteChange,
    onDateTimeChange,
    onNaasRawChange,
    onUseNow,
}) {
    const [siteMenuOpen, setSiteMenuOpen] = useState(false);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [dateMenuLayout, setDateMenuLayout] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const initialDate = parseDateTimeValue(dateTimeValue) || new Date();
        return startOfMonth(initialDate);
    });

    const siteMenuRef = useRef(null);
    const dateMenuRef = useRef(null);
    const dateMenuPopupRef = useRef(null);

    const selectedSiteLabel = useMemo(
        () => siteOptions.find((site) => site.value === siteValue)?.label || siteValue || 'Select site',
        [siteOptions, siteValue],
    );
    const selectedDate = useMemo(() => parseDateTimeValue(dateTimeValue), [dateTimeValue]);
    const displayDateTime = useMemo(() => formatDateTimeDisplay(dateTimeValue), [dateTimeValue]);
    const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
    const timeHours = selectedDate ? selectedDate.getHours() : new Date().getHours();
    const timeMinutes = selectedDate ? selectedDate.getMinutes() : new Date().getMinutes();

    const toggleDateMenu = () => {
        const nextOpen = !dateMenuOpen;
        if (nextOpen) {
            const pivotDate = selectedDate || new Date();
            setCalendarMonth(startOfMonth(pivotDate));
        }
        setDateMenuOpen(nextOpen);
    };

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (siteMenuRef.current && !siteMenuRef.current.contains(event.target)) {
                setSiteMenuOpen(false);
            }

            const clickedDateTrigger = dateMenuRef.current?.contains(event.target);
            const clickedDatePopup = dateMenuPopupRef.current?.contains(event.target);
            if (!clickedDateTrigger && !clickedDatePopup) {
                setDateMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, []);

    useEffect(() => {
        if (!dateMenuOpen) return undefined;

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setDateMenuOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [dateMenuOpen]);

    useEffect(() => {
        if (!dateMenuOpen) return undefined;

        const updateLayout = () => {
            const trigger = dateMenuRef.current;
            if (!trigger) return;

            const rect = trigger.getBoundingClientRect();
            const viewportPadding = 10;
            const maxPreferredHeight = Math.min(490, Math.floor(window.innerHeight * 0.76));
            const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
            const spaceAbove = rect.top - viewportPadding;
            const openUp = spaceBelow < 350 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(
                340,
                Math.min(maxPreferredHeight, Math.max(spaceBelow, spaceAbove)),
            );
            const preferredWidth = Math.max(360, rect.width);
            const maxWidth = Math.min(430, window.innerWidth - viewportPadding * 2);
            const width = Math.min(preferredWidth, maxWidth);
            const left = Math.max(
                viewportPadding,
                Math.min(rect.left, window.innerWidth - viewportPadding - width),
            );
            const top = openUp
                ? Math.max(viewportPadding, rect.top - maxHeight - 8)
                : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + 8);

            setDateMenuLayout({
                top,
                left,
                width,
                maxHeight,
            });
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('scroll', updateLayout, true);
        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('scroll', updateLayout, true);
        };
    }, [dateMenuOpen]);

    const commitDate = (nextDate) => {
        if (!(nextDate instanceof Date) || Number.isNaN(nextDate.getTime())) return;
        onDateTimeChange(toLocalDateTimeValue(nextDate));
    };

    const currentOrNowDate = () => selectedDate ? new Date(selectedDate) : new Date();

    const handleSelectDay = (nextDay) => {
        const baseDate = currentOrNowDate();
        const nextDate = new Date(
            nextDay.getFullYear(),
            nextDay.getMonth(),
            nextDay.getDate(),
            baseDate.getHours(),
            baseDate.getMinutes(),
            0,
            0,
        );
        commitDate(nextDate);
        setCalendarMonth(startOfMonth(nextDay));
    };

    const shiftHours = (delta) => {
        const nextDate = currentOrNowDate();
        nextDate.setHours(nextDate.getHours() + delta);
        commitDate(nextDate);
    };

    const shiftMinutes = (delta) => {
        const nextDate = currentOrNowDate();
        nextDate.setMinutes(nextDate.getMinutes() + delta);
        commitDate(nextDate);
    };

    const jumpToNow = () => {
        const now = new Date();
        commitDate(now);
        setCalendarMonth(startOfMonth(now));
    };

    const dateMenuPortal = dateMenuOpen && dateMenuLayout
        ? createPortal(
            <div
                ref={dateMenuPopupRef}
                className="ts-datetime-menu glass-card animate-slide-down"
                style={{
                    top: dateMenuLayout.top,
                    left: dateMenuLayout.left,
                    width: dateMenuLayout.width,
                    '--ts-datetime-menu-max-height': `${dateMenuLayout.maxHeight}px`,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="ts-datetime-menu__header">
                    <div className="ts-datetime-menu__month-nav">
                        <button
                            type="button"
                            className="ts-datetime-menu__icon-btn"
                            onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            aria-label="Previous month"
                        >
                            <HiChevronLeft size={16} />
                        </button>
                        <strong className="ts-datetime-menu__month-label">
                            {calendarMonth.toLocaleString([], { month: 'long', year: 'numeric' })}
                        </strong>
                        <button
                            type="button"
                            className="ts-datetime-menu__icon-btn"
                            onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            aria-label="Next month"
                        >
                            <HiChevronRight size={16} />
                        </button>
                    </div>
                    <button
                        type="button"
                        className="ts-datetime-menu__close"
                        onClick={() => setDateMenuOpen(false)}
                        aria-label="Close date picker"
                    >
                        <HiX size={15} />
                    </button>
                </div>

                <div className="ts-datetime-menu__weekdays">
                    {WEEKDAY_LABELS.map((label) => (
                        <span key={label}>{label}</span>
                    ))}
                </div>

                <div className="ts-datetime-menu__days">
                    {calendarDays.map(({ date, isInMonth }) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        return (
                            <button
                                key={dayKey(date)}
                                type="button"
                                className={[
                                    'ts-datetime-menu__day',
                                    isInMonth ? '' : 'is-outside',
                                    isSelected ? 'is-selected' : '',
                                    isToday ? 'is-today' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => handleSelectDay(date)}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>

                <div className="ts-datetime-menu__time">
                    <div className="ts-datetime-menu__stepper">
                        <span className="ts-datetime-menu__step-label">Hour</span>
                        <div className="ts-datetime-menu__step-controls">
                            <button type="button" className="ts-datetime-menu__step-btn" onClick={() => shiftHours(-1)}>-</button>
                            <span className="ts-datetime-menu__step-value">{String(timeHours).padStart(2, '0')}</span>
                            <button type="button" className="ts-datetime-menu__step-btn" onClick={() => shiftHours(1)}>+</button>
                        </div>
                    </div>

                    <div className="ts-datetime-menu__stepper">
                        <span className="ts-datetime-menu__step-label">Minute</span>
                        <div className="ts-datetime-menu__step-controls">
                            <button type="button" className="ts-datetime-menu__step-btn" onClick={() => shiftMinutes(-5)}>-</button>
                            <span className="ts-datetime-menu__step-value">{String(timeMinutes).padStart(2, '0')}</span>
                            <button type="button" className="ts-datetime-menu__step-btn" onClick={() => shiftMinutes(5)}>+</button>
                        </div>
                    </div>
                </div>

                <div className="ts-datetime-menu__actions">
                    <button type="button" className="btn btn-secondary ts-datetime-menu__action-btn" onClick={jumpToNow}>
                        <HiClock size={14} />
                        Now
                    </button>
                    <button type="button" className="btn btn-secondary ts-datetime-menu__action-btn" onClick={() => shiftMinutes(15)}>
                        +15m
                    </button>
                    <button type="button" className="btn btn-primary ts-datetime-menu__action-btn" onClick={() => setDateMenuOpen(false)}>
                        Done
                    </button>
                </div>
            </div>,
            document.body,
        )
        : null;

    return (
        <div className="ts-field ts-input-block">
            <div className="ts-naas-meta__header">
                <label className="ts-label">Request Context</label>
                <button type="button" className="btn btn-secondary ts-naas-now-btn" onClick={onUseNow}>
                    <HiClock size={13} />
                    Use current time
                </button>
            </div>

            <div className="ts-naas-meta">
                <div className="ts-field">
                    <label className="ts-label">Site</label>
                    <div className="ts-site-select" ref={siteMenuRef}>
                        <button
                            type="button"
                            className={`ts-site-select__trigger ${siteMenuOpen ? 'is-open' : ''}`}
                            onClick={() => setSiteMenuOpen((prev) => !prev)}
                        >
                            <span className="ts-site-select__value">{selectedSiteLabel}</span>
                            <HiChevronDown size={17} className={`ts-site-select__chevron ${siteMenuOpen ? 'is-open' : ''}`} />
                        </button>

                        {siteMenuOpen && (
                            <div className="ts-site-select__menu glass-card">
                                {siteOptions.map((site) => {
                                    const isSelected = site.value === siteValue;
                                    return (
                                        <button
                                            key={site.value}
                                            type="button"
                                            className={`ts-site-select__option ${isSelected ? 'is-selected' : ''}`}
                                            onClick={() => {
                                                onSiteChange(site.value);
                                                setSiteMenuOpen(false);
                                            }}
                                        >
                                            <span className={`ts-site-select__check ${isSelected ? 'is-selected' : ''}`}>
                                                {isSelected && <HiCheck size={12} />}
                                            </span>
                                            <span className="ts-site-select__label">{site.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ts-field">
                    <label className="ts-label">Date & Time</label>
                    <div className="ts-datetime-picker" ref={dateMenuRef}>
                        <button
                            type="button"
                            className={`ts-datetime-picker__trigger ${dateMenuOpen ? 'is-open' : ''}`}
                            aria-haspopup="dialog"
                            aria-expanded={dateMenuOpen}
                            onClick={toggleDateMenu}
                        >
                            <span className="ts-datetime-picker__leading" aria-hidden="true">
                                <HiCalendar size={16} />
                            </span>
                            <span className={`ts-datetime-picker__value ${selectedDate ? '' : 'is-placeholder'}`}>
                                {displayDateTime}
                            </span>
                            <span className="ts-datetime-picker__tz">LOCAL</span>
                        </button>
                    </div>
                </div>
            </div>

            <label className="ts-label">NAA List ({naasCount})</label>
            <textarea
                className="input-field ts-naas-input"
                rows={6}
                value={naasRawValue}
                onChange={(event) => onNaasRawChange(event.target.value)}
                placeholder="Paste NAAs separated by comma, space, or new line"
            />

            {!!naasCount && (
                <div className="ts-naas-preview">
                    {parsedNaas.slice(0, 12).map((naa) => (
                        <span key={naa} className="ts-naas-chip">{naa}</span>
                    ))}
                    {naasCount > 12 && (
                        <span className="ts-naas-chip ts-naas-chip--more">+{naasCount - 12} more</span>
                    )}
                </div>
            )}
            {dateMenuPortal}
        </div>
    );
}
