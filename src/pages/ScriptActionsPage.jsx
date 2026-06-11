import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HiLightningBolt, HiPencilAlt, HiPlus, HiRefresh, HiSearch, HiX } from 'react-icons/hi';
import {
    getScripts,
    runScriptRequest,
    createScript,
    updateScript,
    deleteScript,
} from '@/api/scripts';
import ScriptModal from '@/components/ScriptActions/ScriptModal';
import ScriptEditorModal from '@/components/ScriptActions/ScriptEditorModal';
import ScriptResultPopup from '@/components/ScriptActions/ScriptResultPopup';
import { useTeam } from '@/contexts/TeamContext';
import './ScriptActionsPage.css';

const ACCENT_COLORS = [
    '#29a36a', '#2f7df4', '#0ea5a4', '#d97706',
    '#d9467a', '#84a114', '#0891b2', '#7c3aed',
    '#be123c', '#ea580c', '#16a34a', '#c26a2d',
];

function hashAccent(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}

function methodBadgeClass(method) {
    return `script-card__method-badge method-${String(method || '').toLowerCase()}`;
}

function matchesSearch(script, query) {
    if (!query) return true;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
        String(script.label || '').toLowerCase().includes(term)
        || String(script.id || '').toLowerCase().includes(term)
        || String(script.description || '').toLowerCase().includes(term)
        || String(script.method || '').toLowerCase().includes(term)
    );
}

function ScriptCard({ script, onClick, onEdit }) {
    const accent = hashAccent(script.id);
    const fieldCount = (script.fields_required || []).length;

    return (
        <div
            className="script-card"
            style={{ '--script-accent': accent }}
            onClick={() => onClick(script)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(script)}
        >
            <button
                type="button"
                className="script-card__edit-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(script);
                }}
                aria-label={`Edit ${script.label}`}
                title="Edit script"
            >
                <HiPencilAlt size={14} />
            </button>

            <div className="script-card__header">
                <div className="script-card__icon" style={{ background: accent }}>
                    <HiLightningBolt size={18} />
                </div>
                <span className={methodBadgeClass(script.method)}>
                    {script.method}
                </span>
            </div>

            <h3 className="script-card__label">{script.label}</h3>

            {script.description && (
                <p className="script-card__description">{script.description}</p>
            )}

            {fieldCount > 0 && (
                <span className="script-card__fields-count">
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
}

export default function ScriptActionsPage() {
    const [activeScript, setActiveScript] = useState(null);
    const [editorScript, setEditorScript] = useState(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [search, setSearch] = useState('');

    const queryClient = useQueryClient();
    const { currentTeam } = useTeam();
    const teamId = currentTeam?.id || '';

    const { data: scripts, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['scripts', teamId],
        queryFn: () => getScripts(teamId),
        retry: false,
        refetchOnWindowFocus: false,
    });

    const scriptList = Array.isArray(scripts) ? scripts : [];
    const filteredScripts = useMemo(
        () => scriptList.filter((s) => matchesSearch(s, search)),
        [scriptList, search],
    );

    const openEditor = (script = null) => {
        setEditorScript(script);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditorScript(null);
    };

    const handleRunSubmit = async (values) => {
        const data = await runScriptRequest(activeScript, values);
        const message =
            (data && typeof data === 'object' && (data.message || data.detail))
            || `${activeScript.method} ${activeScript.url} completed.`;
        const jobId = (data && (data.jobId || data.job_id)) || '';
        setActiveScript(null);
        setResult({
            type: 'success',
            label: activeScript.label,
            message: String(message),
            jobId: String(jobId),
        });
    };

    const handleEditorSave = async (payload, mode) => {
        if (mode === 'create') {
            await createScript(payload, teamId);
        } else {
            await updateScript(editorScript.id, payload, teamId);
        }
        await queryClient.invalidateQueries({ queryKey: ['scripts'] });
        closeEditor();
    };

    const handleEditorDelete = async (id) => {
        await deleteScript(id, teamId);
        await queryClient.invalidateQueries({ queryKey: ['scripts'] });
        closeEditor();
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Script Actions</h1>
                    <p className="page-subtitle">Run predefined scripts against the network API.</p>
                </div>
                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                    >
                        <HiRefresh size={16} className={isFetching ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openEditor(null)}
                    >
                        <HiPlus size={16} />
                        Add Script
                    </button>
                </div>
            </div>

            <div className="page-content script-actions-page-content">
                <div className="script-actions-search">
                    <HiSearch size={16} className="script-actions-search__icon" />
                    <input
                        type="text"
                        className="script-actions-search__input"
                        placeholder="Search scripts by name, id, description, or method..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            className="script-actions-search__clear"
                            onClick={() => setSearch('')}
                            aria-label="Clear search"
                        >
                            <HiX size={14} />
                        </button>
                    )}
                </div>

                <div className="script-actions-grid">
                    {isLoading && (
                        <div className="script-actions-empty">Loading scripts...</div>
                    )}

                    {isError && !isLoading && (
                        <div className="script-actions-error">
                            {error?.message || 'Failed to load scripts.'}
                        </div>
                    )}

                    {!isLoading && !isError && scriptList.length === 0 && (
                        <div className="script-actions-empty">
                            No scripts yet. Click "Add Script" to create one.
                        </div>
                    )}

                    {!isLoading && !isError && scriptList.length > 0 && filteredScripts.length === 0 && (
                        <div className="script-actions-empty">
                            No scripts match "{search}".
                        </div>
                    )}

                    {filteredScripts.map((script) => (
                        <ScriptCard
                            key={script.id}
                            script={script}
                            onClick={setActiveScript}
                            onEdit={openEditor}
                        />
                    ))}
                </div>
            </div>

            {activeScript && (
                <ScriptModal
                    script={activeScript}
                    onClose={() => setActiveScript(null)}
                    onSubmit={handleRunSubmit}
                />
            )}

            {editorOpen && (
                <ScriptEditorModal
                    script={editorScript}
                    onClose={closeEditor}
                    onSave={handleEditorSave}
                    onDelete={editorScript ? handleEditorDelete : undefined}
                />
            )}

            <ScriptResultPopup result={result} onClose={() => setResult(null)} />
        </div>
    );
}
