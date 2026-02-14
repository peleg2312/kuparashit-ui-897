import { useState } from 'react';
import { herziCategories, getBoxesByCategory } from '../config/herziBoxes';
import { herziApi } from '../api';
import { HiSearch, HiLightningBolt, HiX } from 'react-icons/hi';
import { formatHerziToolResult, normalizeHerziInput } from '../utils/herziHandlers';
import './HerziToolsPage.css';

function ResultPopup({ result, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content herzi-result-modal animate-scale" onClick={(e) => e.stopPropagation()}>
                <div className="herzi-result-header">
                    <h3>Tool Result</h3>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={22} />
                    </button>
                </div>
                <div className="herzi-result-body">
                    <pre>{result}</pre>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function DynamicBox({ box }) {
    const [input, setInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const normalizedInput = normalizeHerziInput(input);
        if (!normalizedInput) return;
        setLoading(true);
        try {
            const response = await herziApi.query(box.endpoint, normalizedInput);
            setResult(formatHerziToolResult(response));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="herzi-box glass-card">
                <div className="herzi-box__icon-wrapper">
                    <HiLightningBolt size={28} />
                </div>
                <div className="herzi-box__content">
                    <h3 className="herzi-box__title">{box.title}</h3>
                    <div className="herzi-box__cats">
                        {box.categories.map((category) => (
                            <span key={category} className="badge badge-accent small-badge">{category}</span>
                        ))}
                    </div>
                    <div className="herzi-box__input-area">
                        <input
                            className="herzi-input"
                            placeholder={box.inputLabel}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <button
                            className="btn-primary herzi-submit-btn"
                            onClick={handleSubmit}
                            disabled={loading}
                            title="Run Tool"
                        >
                            {loading ? <span className="animate-spin">...</span> : <HiSearch size={18} />}
                        </button>
                    </div>
                </div>
            </div>
            {result && <ResultPopup result={result} onClose={() => setResult(null)} />}
        </>
    );
}

export default function HerziToolsPage() {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const boxes = getBoxesByCategory(activeCategory);

    return (
        <div className="page-container">
            <div className="page-header centered-header">
                <div>
                    <h1 className="page-title">Herzi Tools</h1>
                    <p className="page-subtitle">Dynamic tools by category with long-form popup results</p>
                </div>
            </div>

            <div className="page-content">
                <div className="herzi-categories-wrapper">
                    <div className="herzi-categories">
                        {herziCategories.map((category) => (
                            <button
                                key={category}
                                className={`herzi-cat-btn ${activeCategory === category ? 'herzi-cat-btn--active' : ''}`}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="herzi-grid">
                    {boxes.map((box) => (
                        <DynamicBox key={box.id} box={box} />
                    ))}
                </div>
            </div>
        </div>
    );
}
