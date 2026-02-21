function normalizeHref(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return `https://${raw}`;
}

export default function ObjectUrlCell({ value }) {
    const rawUrl = String(value || '').trim();
    const href = normalizeHref(rawUrl);

    const handleOpen = (event) => {
        event.stopPropagation();
        if (!href) return;
        window.open(href, '_blank', 'noopener,noreferrer');
    };

    if (!rawUrl) {
        return <span className="badge badge-warning">none</span>;
    }

    return (
        <div>
            <button
                className="btn dt-open-url-btn"
                onClick={handleOpen}
            >
                Open URL
            </button>
        </div>
    );
}
