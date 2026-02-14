import { useEffect, useRef } from 'react';
import { HiTerminal } from 'react-icons/hi';

export default function TerminalPanel({
    title,
    lines,
    onClear,
    emptyMessage,
}) {
    const terminalRef = useRef(null);

    useEffect(() => {
        if (!terminalRef.current) return;
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, [lines]);

    return (
        <section className="glass-card netapp-panel netapp-panel--terminal">
            <div className="netapp-panel__title-row">
                <h2>
                    <HiTerminal size={18} />
                    {title}
                </h2>
                <button type="button" className="btn btn-ghost netapp-small-btn" onClick={onClear}>
                    Clear
                </button>
            </div>
            <div className="netapp-terminal" ref={terminalRef}>
                {lines.length === 0 ? (
                    <div className="netapp-terminal__placeholder">
                        {emptyMessage}
                    </div>
                ) : (
                    lines.map((line) => (
                        <div key={line.id} className={`netapp-terminal__line netapp-terminal__line--${line.tone}`}>
                            {line.text}
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
