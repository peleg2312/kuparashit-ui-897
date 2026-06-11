import { useTeam } from '@/contexts/TeamContext';

/**
 * Dashy-style multi-select chip picker for "Visible Teams".
 * An EMPTY array means "visible to all teams" (matches catalog convention).
 */
export default function ScriptEditorTeamPicker({ value = [], onChange }) {
    const { userTeams, currentTeam } = useTeam();
    const options = userTeams || [];
    const selected = Array.isArray(value) ? value : [];

    const toggle = (teamId) => {
        if (selected.includes(teamId)) {
            onChange(selected.filter((t) => t !== teamId));
        } else {
            onChange([...selected, teamId]);
        }
    };

    const selectAll = () => onChange(options.map((t) => t.id));
    const clear = () => onChange([]);

    if (options.length === 0) {
        return (
            <div className="form-group script-editor-grid__full">
                <label className="form-label">Visible Teams</label>
                <p className="script-editor-empty script-editor-empty--inline">
                    You don't belong to any teams.
                </p>
            </div>
        );
    }

    return (
        <div className="form-group script-editor-grid__full">
            <div className="script-team-picker__header">
                <label className="form-label">
                    Visible Teams
                    <span className="form-label__hint">
                        {selected.length === 0
                            ? '(empty = visible to all)'
                            : `(${selected.length} selected)`}
                    </span>
                </label>
                <div className="script-team-picker__actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll}>
                        Select all
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
                        Clear
                    </button>
                </div>
            </div>
            <div className="script-team-picker__chips">
                {options.map((team) => {
                    const isSelected = selected.includes(team.id);
                    const isCurrent = currentTeam?.id === team.id;
                    return (
                        <button
                            key={team.id}
                            type="button"
                            className={`script-team-chip ${isSelected ? 'is-selected' : ''} ${isCurrent ? 'is-current' : ''}`}
                            onClick={() => toggle(team.id)}
                            title={isCurrent ? `${team.id} (your current team)` : team.id}
                        >
                            {team.label || team.id}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
