import { BACKEND_OPTIONS, METHODS } from './scriptEditorHelpers';

export default function ScriptEditorTopFields({ state, errors, onChange }) {
    return (
        <div className="script-editor-grid">
            <div className="form-group">
                <label className="form-label">
                    Label
                    <span className="required-star">*</span>
                </label>
                <input
                    className="input-field"
                    type="text"
                    placeholder="e.g. Create Port Channel"
                    value={state.label}
                    onChange={(e) => onChange('label', e.target.value)}
                />
                {errors.label && <span className="field-error">{errors.label}</span>}
            </div>

            <div className="form-group script-editor-grid__full">
                <label className="form-label">Description</label>
                <input
                    className="input-field"
                    type="text"
                    placeholder="Short description shown on the cube"
                    value={state.description}
                    onChange={(e) => onChange('description', e.target.value)}
                />
            </div>

            <div className="form-group script-editor-grid__url">
                <label className="form-label">
                    Request URL
                    <span className="required-star">*</span>
                </label>
                <input
                    className="input-field"
                    type="url"
                    placeholder="https://api.example.com/endpoint"
                    value={state.url}
                    onChange={(e) => onChange('url', e.target.value)}
                />
                {errors.url && <span className="field-error">{errors.url}</span>}
            </div>

            <div className="form-group">
                <label className="form-label">
                    Method
                    <span className="required-star">*</span>
                </label>
                <select
                    className="input-field"
                    value={state.method}
                    onChange={(e) => onChange('method', e.target.value)}
                >
                    {METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">
                    Backend
                    <span className="form-label__hint">(auth to send with the request)</span>
                </label>
                <select
                    className="input-field"
                    value={state.backend || 'other'}
                    onChange={(e) => onChange('backend', e.target.value)}
                >
                    {BACKEND_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
