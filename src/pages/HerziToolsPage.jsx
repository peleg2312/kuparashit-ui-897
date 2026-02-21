import { useState } from 'react';
import HerziDynamicBox from '@/components/HerziTools/HerziDynamicBox';
import { herziCategories, getBoxesByCategory } from '@/config/herziBoxes';
import './HerziToolsPage.css';

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
                        <HerziDynamicBox key={box.id} box={box} />
                    ))}
                </div>
            </div>
        </div>
    );
}
