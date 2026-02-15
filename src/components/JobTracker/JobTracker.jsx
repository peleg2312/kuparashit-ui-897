import { useEffect, useRef, useState } from 'react';
import { HiX, HiCheckCircle, HiXCircle, HiClock, HiRefresh } from 'react-icons/hi';
import { mainApi } from '../../api';
import './JobTracker.css';

function normalizeStatusPayload(payload) {
    const rawSteps = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.steps) ? payload.steps : []);

    const steps = rawSteps.map((step, index) => ({
        name: step?.name || `Step ${index + 1}`,
        status: step?.status || 'pending',
    }));

    const hasFailed = steps.some((step) => step.status === 'failed');
    const hasRunning = steps.some((step) => step.status === 'running');
    const allSuccess = steps.length > 0 && steps.every((step) => step.status === 'success');

    const status = typeof payload?.status === 'string'
        ? payload.status
        : (hasFailed ? 'failed' : (allSuccess ? 'success' : (hasRunning ? 'running' : 'pending')));

    const finished = typeof payload?.finished === 'boolean'
        ? payload.finished
        : (hasFailed || allSuccess);

    const progress = typeof payload?.progress === 'number'
        ? payload.progress
        : (steps.length
            ? Math.round((steps.filter((step) => step.status === 'success').length / steps.length) * 100)
            : 0);

    return {
        steps,
        status,
        finished,
        progress,
        message: typeof payload?.message === 'string' ? payload.message : '',
        error: typeof payload?.error === 'string' ? payload.error : '',
    };
}

export default function JobTracker({ job, onClose }) {
    const [statusByJob, setStatusByJob] = useState({});
    const [pollErrorByJob, setPollErrorByJob] = useState({});
    const pollTimerRef = useRef(null);

    useEffect(() => {
        if (!job?.jobId) return undefined;

        let cancelled = false;

        const poll = async () => {
            try {
                const response = await mainApi.getJobStatus(job.jobId);
                if (cancelled) return;
                const normalizedStatus = normalizeStatusPayload(response);

                setStatusByJob((prev) => ({ ...prev, [job.jobId]: normalizedStatus }));
                setPollErrorByJob((prev) => ({ ...prev, [job.jobId]: '' }));

                if (normalizedStatus.finished || normalizedStatus.status === 'success' || normalizedStatus.status === 'failed') return;
            } catch (error) {
                if (cancelled) return;
                setPollErrorByJob((prev) => ({ ...prev, [job.jobId]: error?.message || 'Failed to fetch job status' }));
            }

            if (!cancelled) {
                pollTimerRef.current = window.setTimeout(poll, 3000);
            }
        };

        poll();

        return () => {
            cancelled = true;
            if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
        };
    }, [job?.jobId]);

    if (!job) return null;

    const statusData = statusByJob[job.jobId] || null;
    const pollError = pollErrorByJob[job.jobId] || '';
    const steps = statusData?.steps || [];
    const completed = statusData?.status === 'success';
    const failed = statusData?.status === 'failed';
    const progress = typeof statusData?.progress === 'number' ? statusData.progress : 0;

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
            <div className="modal-content job-tracker" onClick={(event) => event.stopPropagation()}>
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
                    {!statusData ? (
                        <div className="job-tracker__loading" aria-live="polite">
                            <div className="job-loader-orbit" aria-hidden="true">
                                <span className="job-loader-orbit__ring job-loader-orbit__ring--outer" />
                                <span className="job-loader-orbit__ring job-loader-orbit__ring--inner" />
                                <span className="job-loader-orbit__core">
                                    <HiRefresh size={16} className="job-tracker__loading-spinner animate-spin" />
                                </span>
                            </div>

                            <div className="job-tracker__loading-copy">
                                <p>Preparing execution timeline</p>
                                <span>Waiting for first backend status response...</span>
                            </div>

                            <div className="job-tracker__loading-skeleton" aria-hidden="true">
                                <div className="job-tracker__loading-row">
                                    <span className="job-tracker__loading-dot" />
                                    <span className="job-tracker__loading-line job-tracker__loading-line--w1" />
                                </div>
                                <div className="job-tracker__loading-row">
                                    <span className="job-tracker__loading-dot" />
                                    <span className="job-tracker__loading-line job-tracker__loading-line--w2" />
                                </div>
                                <div className="job-tracker__loading-row">
                                    <span className="job-tracker__loading-dot" />
                                    <span className="job-tracker__loading-line job-tracker__loading-line--w3" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {steps.map((step, index) => (
                                <div key={`${step.name}-${index}`} className={`job-step job-step--${step.status}`}>
                                    <div className="job-step__connector">
                                        {getStepIcon(step.status)}
                                        {index < steps.length - 1 && (
                                            <div className={`job-step__line ${steps[index + 1]?.status !== 'pending' ? 'job-step__line--filled' : ''}`} />
                                        )}
                                    </div>
                                    <div className="job-step__content">
                                        <span className="job-step__name">{index + 1}. {step.name}</span>
                                        <span className="job-step__status">{step.status}</span>
                                    </div>
                                </div>
                            ))}
                            {!steps.length && <p className="job-tracker__empty">No step data returned from backend yet.</p>}
                        </>
                    )}
                </div>

                {completed && (
                    <div className="job-tracker__result job-tracker__result--success animate-scale">
                        <HiCheckCircle size={32} />
                        <div>
                            <h3>Operation Completed Successfully</h3>
                            <p>{statusData?.message || job?.message || 'All backend steps finished successfully.'}</p>
                        </div>
                    </div>
                )}

                {failed && (
                    <div className="job-tracker__result job-tracker__result--failed animate-scale">
                        <HiXCircle size={32} />
                        <div>
                            <h3>Operation Failed</h3>
                            <p>{statusData?.error || job?.error || 'Backend reported a failure while executing the job.'}</p>
                        </div>
                    </div>
                )}

                {!!pollError && (
                    <p className="job-tracker__poll-error">{pollError}</p>
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
