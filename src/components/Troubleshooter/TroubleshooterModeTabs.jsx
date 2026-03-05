import { TROUBLESHOOTER_MODE_CONFIG } from '@/config/troubleshooterModes';

export default function TroubleshooterModeTabs({ activeModeKey, running, onSelectMode }) {
    return (
        <div className="ts-mode-tabs">
            {Object.values(TROUBLESHOOTER_MODE_CONFIG).map((mode) => {
                const ModeIcon = mode.icon;
                const isActive = activeModeKey === mode.key;
                return (
                    <button
                        key={mode.key}
                        type="button"
                        className={`ts-mode-tab ${isActive ? 'ts-mode-tab--active' : ''}`}
                        style={isActive ? { borderColor: mode.color, color: mode.color } : {}}
                        disabled={running}
                        onClick={() => onSelectMode(mode.key)}
                    >
                        <span className="ts-mode-tab__dot" style={{ background: mode.color }} />
                        <ModeIcon size={16} />
                        {mode.label}
                    </button>
                );
            })}
        </div>
    );
}
