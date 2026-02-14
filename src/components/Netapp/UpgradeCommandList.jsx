import { HiPlusCircle, HiX } from 'react-icons/hi';

function formatStatusLabel(status) {
    if (status === 'running') return 'Running';
    if (status === 'done') return 'Done';
    if (status === 'error') return 'Error';
    return 'Idle';
}

function statusClassName(status) {
    if (status === 'running') return 'badge-info';
    if (status === 'done') return 'badge-success';
    if (status === 'error') return 'badge-error';
    return 'badge-accent';
}

export default function UpgradeCommandList({
    commands,
    activeCommandId,
    onSelectCommand,
    onUpdateCommand,
    onRemoveCommand,
    onAddCommand,
}) {
    return (
        <section className="glass-card netapp-panel netapp-panel--commands">
            <div className="netapp-panel__title-row netapp-panel__title-row--end">
                <button type="button" className="btn btn-secondary netapp-small-btn" onClick={onAddCommand}>
                    <HiPlusCircle size={16} />
                    Add
                </button>
            </div>

            <div className="netapp-command-list">
                {commands.map((command) => (
                    <div
                        key={command.id}
                        className={`netapp-command ${command.id === activeCommandId ? 'netapp-command--active' : ''}`}
                        onClick={() => onSelectCommand(command.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') onSelectCommand(command.id);
                        }}
                    >
                        <div className="netapp-command__row">
                            <span className={`badge ${statusClassName(command.status)}`}>{formatStatusLabel(command.status)}</span>
                            <button
                                type="button"
                                className="netapp-command__remove-icon"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onRemoveCommand(command.id);
                                }}
                                aria-label="Remove command"
                                title="Remove command"
                            >
                                <HiX size={14} />
                            </button>
                        </div>
                        <textarea
                            className="input-field netapp-command__textarea"
                            value={command.command}
                            onChange={(event) => onUpdateCommand(command.id, event.target.value)}
                            rows={Math.max(3, Math.ceil((command.command?.length || 1) / 52))}
                            placeholder="Enter NetApp command"
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
