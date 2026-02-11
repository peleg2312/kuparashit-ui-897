/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { HiX, HiCheckCircle, HiXCircle, HiClock, HiRefresh } from 'react-icons/hi';
import './JobTracker.css';

export default function JobTracker({ job, onClose }) {
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!job) return;
        setSteps(job.steps.map(s => ({ ...s, status: 'pending' })));
        setCurrentStep(0);
        setCompleted(false);
        setFailed(false);
        setError(null);
    }, [job]);

    useEffect(() => {
        if (!job || completed || failed || steps.length === 0) return;
        if (currentStep >= steps.length) {
            setCompleted(true);
            return;
        }

        // Simulate step execution
        const timer1 = setTimeout(() => {
            setSteps(prev => prev.map((s, i) =>
                i === currentStep ? { ...s, status: 'running' } : s
            ));
        }, 300);

        const step = job.steps[currentStep];
        const timer2 = setTimeout(() => {
            // 10% chance of failure on last step for demo variety
            const shouldFail = currentStep === steps.length - 1 && Math.random() < 0.1;
            if (shouldFail) {
                setSteps(prev => prev.map((s, i) =>
                    i === currentStep ? { ...s, status: 'failed' } : s
                ));
                setFailed(true);
                setError('Connection timeout: Unable to verify operation result. Please check manually.');
            } else {
                setSteps(prev => prev.map((s, i) =>
                    i === currentStep ? { ...s, status: 'success' } : s
                ));
                setCurrentStep(c => c + 1);
            }
        }, step.duration);

        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, [currentStep, job, completed, failed, steps.length]);

    if (!job) return null;

    const progress = Math.round((steps.filter((s) => s.status === 'success').length / (steps.length || 1)) * 100);

    const getStepIcon = (status) => {
        switch (status) {
            case 'success': return <HiCheckCircle size={20} className="step-icon step-icon--success" />;
            case 'running': return <HiRefresh size={20} className="step-icon step-icon--running animate-spin" />;
            case 'failed': return <HiXCircle size={20} className="step-icon step-icon--failed" />;
            default: return <HiClock size={20} className="step-icon step-icon--pending" />;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content job-tracker" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Job Execution</h2>
                        <p className="job-tracker__id">ID: {job.jobId}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <HiX size={18} />
                    </button>
                </div>

                <div className="job-tracker__progress">
                    <div className="job-tracker__progress-bar" style={{ width: `${progress}%` }} />
                    <span>{progress}%</span>
                </div>

                <div className="job-tracker__steps">
                    {steps.map((step, i) => (
                        <div key={i} className={`job-step job-step--${step.status}`}>
                            <div className="job-step__connector">
                                {getStepIcon(step.status)}
                                {i < steps.length - 1 && <div className={`job-step__line ${steps[i + 1]?.status !== 'pending' ? 'job-step__line--filled' : ''}`} />}
                            </div>
                            <div className="job-step__content">
                                <span className="job-step__name">{i + 1}. {step.name}</span>
                                <span className="job-step__status">{step.status}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {completed && (
                    <div className="job-tracker__result job-tracker__result--success animate-scale">
                        <HiCheckCircle size={32} />
                        <div>
                            <h3>Operation Completed Successfully</h3>
                            <p>All steps have been executed without errors.</p>
                        </div>
                    </div>
                )}

                {failed && (
                    <div className="job-tracker__result job-tracker__result--failed animate-scale">
                        <HiXCircle size={32} />
                        <div>
                            <h3>Operation Failed</h3>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        {completed || failed ? 'Close' : 'Run in Background'}
                    </button>
                </div>
            </div>
        </div>
    );
}
