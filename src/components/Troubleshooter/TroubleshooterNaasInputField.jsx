import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiCalendar, HiCheck, HiChevronDown, HiClock } from 'react-icons/hi';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';

function formatDateTimeDisplay(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return 'Select date and time';
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return 'Select date and time';
    return parsed.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function toLocalDateTimeValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizePickerDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
        return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
        const parsed = dateValue.toDate();
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    const [dateTimeMenuOpen, setDateTimeMenuOpen] = useState(false);
    const [dateTimeMenuLayout, setDateTimeMenuLayout] = useState(null);
    const siteMenuRef = useRef(null);
    const dateTimeMenuRef = useRef(null);
    const dateTimeMenuPopupRef = useRef(null);
    const defaultPickerStyles = useDefaultStyles('dark');

    const selectedSiteLabel = useMemo(
        () => siteOptions.find((site) => site.value === siteValue)?.label || siteValue || 'Select site',
        [siteOptions, siteValue],
    );
    const dateTimeDisplay = useMemo(() => formatDateTimeDisplay(dateTimeValue), [dateTimeValue]);
    const selectedDate = useMemo(() => normalizePickerDate(dateTimeValue), [dateTimeValue]);
    const pickerStyles = useMemo(() => ({
        ...defaultPickerStyles,
        header: {
            ...defaultPickerStyles.header,
            marginBottom: 8,
        },
        day_cell: {
            ...defaultPickerStyles.day_cell,
            padding: 2,
        },
        day: {
            ...defaultPickerStyles.day,
            borderRadius: 9,
            minHeight: 33,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
        },
        day_label: {
            ...defaultPickerStyles.day_label,
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: '700',
        },
        outside_label: {
            ...defaultPickerStyles.outside_label,
            color: 'var(--text-muted)',
            opacity: 0.7,
        },
        weekday_label: {
            ...defaultPickerStyles.weekday_label,
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: '800',
            textTransform: 'uppercase',
        },
        month_selector_label: {
            ...defaultPickerStyles.month_selector_label,
            color: 'var(--text-primary)',
            fontSize: 15,
            fontWeight: '800',
        },
        year_selector_label: {
            ...defaultPickerStyles.year_selector_label,
            color: 'var(--text-primary)',
            fontSize: 15,
            fontWeight: '800',
        },
        time_selector_label: {
            ...defaultPickerStyles.time_selector_label,
            color: 'var(--text-primary)',
            fontSize: 15,
            fontWeight: '800',
        },
        selected: {
            ...defaultPickerStyles.selected,
            backgroundColor: 'var(--ts-accent)',
            borderColor: 'var(--ts-accent)',
            borderWidth: 1,
        },
        selected_label: {
            ...defaultPickerStyles.selected_label,
            color: '#fff',
            fontWeight: '800',
        },
        today: {
            ...defaultPickerStyles.today,
            borderColor: 'var(--ts-accent)',
            borderWidth: 1,
            backgroundColor: 'transparent',
        },
        today_label: {
            ...defaultPickerStyles.today_label,
            color: 'var(--text-primary)',
            fontWeight: '700',
        },
        time_label: {
            ...defaultPickerStyles.time_label,
            color: 'var(--text-primary)',
            fontSize: 21,
            fontWeight: '700',
        },
        time_selected_indicator: {
            ...defaultPickerStyles.time_selected_indicator,
            backgroundColor: 'color-mix(in srgb, var(--ts-accent), transparent 82%)',
            borderRadius: 9,
        },
    }), [defaultPickerStyles]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (siteMenuRef.current && !siteMenuRef.current.contains(event.target)) {
                setSiteMenuOpen(false);
            }

            const clickedDateTimeTrigger = dateTimeMenuRef.current?.contains(event.target);
            const clickedDateTimePopup = dateTimeMenuPopupRef.current?.contains(event.target);
            if (!clickedDateTimeTrigger && !clickedDateTimePopup) {
                setDateTimeMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, []);

    useEffect(() => {
        if (!dateTimeMenuOpen) {
            return undefined;
        }

        const updateLayout = () => {
            const trigger = dateTimeMenuRef.current;
            if (!trigger) return;

            const rect = trigger.getBoundingClientRect();
            const viewportPadding = 10;
            const maxPreferredHeight = Math.min(460, Math.floor(window.innerHeight * 0.72));
            const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
            const spaceAbove = rect.top - viewportPadding;
            const openUp = spaceBelow < 270 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(
                220,
                Math.min(maxPreferredHeight, Math.max(spaceBelow, spaceAbove)),
            );
            const preferredWidth = Math.max(320, rect.width);
            const maxWidth = Math.min(420, window.innerWidth - viewportPadding * 2);
            const width = Math.min(preferredWidth, maxWidth);
            const left = Math.max(
                viewportPadding,
                Math.min(rect.left, window.innerWidth - viewportPadding - width),
            );
            const top = openUp
                ? Math.max(viewportPadding, rect.top - maxHeight - 8)
                : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + 8);

            setDateTimeMenuLayout({
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
    }, [dateTimeMenuOpen]);

    const handleDateTimeChange = (dateValue) => {
        const parsedDate = normalizePickerDate(dateValue);
        if (!parsedDate) return;
        onDateTimeChange(toLocalDateTimeValue(parsedDate));
    };

    const dateTimeMenuPortal = dateTimeMenuOpen && dateTimeMenuLayout
        ? createPortal(
            <div
                ref={dateTimeMenuPopupRef}
                className="ts-datetime-picker__menu ts-datetime-picker__menu--portal glass-card animate-slide-down"
                style={{
                    top: dateTimeMenuLayout.top,
                    left: dateTimeMenuLayout.left,
                    width: dateTimeMenuLayout.width,
                    '--ts-datetime-menu-max-height': `${dateTimeMenuLayout.maxHeight}px`,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <DateTimePicker
                    mode="single"
                    date={selectedDate}
                    onChange={({ date }) => handleDateTimeChange(date)}
                    timePicker
                    use12Hours={false}
                    styles={pickerStyles}
                    className="ts-rn-datetime-picker"
                />
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
                    <div
                        ref={dateTimeMenuRef}
                        className="ts-datetime-picker"
                        role="button"
                        tabIndex={0}
                        onClick={() => setDateTimeMenuOpen((prev) => !prev)}
                        aria-expanded={dateTimeMenuOpen}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setDateTimeMenuOpen((prev) => !prev);
                            }
                        }}
                    >
                        <span className={`ts-datetime-picker__value ${dateTimeValue ? '' : 'is-placeholder'}`}>
                            {dateTimeDisplay}
                        </span>
                        <span className="ts-datetime-picker__icon">
                            <HiCalendar size={16} />
                        </span>
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
            {dateTimeMenuPortal}
        </div>
    );
}
