import { useState } from 'react';
import { priceApi } from '../api';
import { HiCurrencyDollar, HiCalculator } from 'react-icons/hi';
import { formatPriceDetailLabel, machineTypes, normalizePriceValues } from '../utils/priceHandlers';
import './PricePage.css';

export default function PricePage() {
    const [activeTab, setActiveTab] = useState('NETAPP');
    const [values, setValues] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const machine = machineTypes[activeTab];

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setValues({});
        setResult(null);
    };

    const handleChange = (name, value) => {
        setValues(v => ({ ...v, [name]: value }));
    };

    const handleCalculate = async () => {
        setLoading(true);
        const res = await priceApi.calculate(activeTab, normalizePriceValues(values));
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Price Calculator</h1>
                    <p className="page-subtitle">Calculate storage costs for different machine types</p>
                </div>
            </div>

            <div className="page-content">
                {/* Tab bar */}
                <div className="price-tabs">
                    {Object.entries(machineTypes).map(([key, m]) => (
                        <button
                            key={key}
                            className={`price-tab ${activeTab === key ? 'price-tab--active' : ''}`}
                            onClick={() => handleTabChange(key)}
                            style={activeTab === key ? { borderColor: m.color, color: m.color } : {}}
                        >
                            <span className="price-tab__dot" style={{ background: m.color }} />
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className="price-layout">
                    {/* Input card */}
                    <div className="price-input-card glass-card">
                        <div className="price-input-header">
                            <HiCalculator size={20} style={{ color: machine.color }} />
                            <div>
                                <h3>{machine.label}</h3>
                                <p>{machine.description}</p>
                            </div>
                        </div>

                        <div className="price-form">
                            {machine.params.map(param => (
                                <div key={param.name} className="form-group">
                                    <label className="form-label">{param.label}</label>
                                    {param.type === 'number' ? (
                                        <input
                                            className="input-field"
                                            type="number"
                                            placeholder={`Enter ${param.label.toLowerCase()}`}
                                            value={values[param.name] || ''}
                                            onChange={e => handleChange(param.name, e.target.value)}
                                        />
                                    ) : param.type === 'toggle' ? (
                                        <label className="toggle-wrapper">
                                            <input
                                                type="checkbox"
                                                className="toggle-input"
                                                checked={!!values[param.name]}
                                                onChange={e => handleChange(param.name, e.target.checked)}
                                            />
                                            <span className="toggle-slider" />
                                            <span className="toggle-label">{values[param.name] ? 'Enabled' : 'Disabled'}</span>
                                        </label>
                                    ) : null}
                                </div>
                            ))}

                            <button
                                className="btn btn-primary price-calc-btn"
                                onClick={handleCalculate}
                                disabled={loading || !values.size}
                                style={{ background: machine.color }}
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <HiCurrencyDollar size={16} />
                                        Calculate Price
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Result card */}
                    {result && (
                        <div className="price-result-card glass-card animate-slide-up">
                            <div className="price-result-header" style={{ borderColor: machine.color }}>
                                <HiCurrencyDollar size={28} style={{ color: machine.color }} />
                                <div>
                                    <span className="price-result-label">Estimated Price</span>
                                    <span className="price-result-value" style={{ color: machine.color }}>${result.price}</span>
                                </div>
                            </div>

                            <div className="price-result-details">
                                {Object.entries(result).filter(([k]) => k !== 'price' && k !== 'error').map(([key, val]) => (
                                    <div key={key} className="price-detail-row">
                                        <span className="price-detail-label">{formatPriceDetailLabel(key)}</span>
                                        <span className="price-detail-value">{String(val)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
