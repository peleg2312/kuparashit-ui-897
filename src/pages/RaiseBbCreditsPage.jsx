import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiCheckCircle, HiExclamationCircle, HiRefresh, HiX } from 'react-icons/hi';
import { mainApi } from '@/api';
import ActionModalSelectField from '@/components/ActionModal/ActionModalSelectField';
import { useTeam } from '@/contexts/TeamContext';
import { useDropdownMenuState } from '@/hooks/actionModal/useDropdownMenuState';
import '@/components/ActionModal/ActionModal.css';
import './RaiseBbCreditsPage.css';

function extractRequestFailure(error) {
    const statusCode = error?.status || error?.cause?.response?.status || null;
    const detail = String(
        error?.cause?.response?.data?.detail
        || error?.message
        || 'Request failed.',
    ).trim();
    return { statusCode, detail };
}

function ResultPopup({ result, onClose }) {
    if (!result) return null;

    const isSuccess = result.type === 'success';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content bbcredits-result-modal" onClick={(event) => event.stopPropagation()}>
                <div className={`bbcredits-result-modal__banner ${isSuccess ? 'is-success' : 'is-error'}`}>
                    <div className="bbcredits-result-modal__icon">
                        {isSuccess ? <HiCheckCircle size={22} /> : <HiExclamationCircle size={22} />}
                    </div>
                    <div>
                        <p className="bbcredits-result-modal__eyebrow">
                            {isSuccess ? 'Request completed' : 'Request failed'}
                        </p>
                        <h2>{isSuccess ? 'BB credits updated' : 'BB credits update failed'}</h2>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose} aria-label="Close result popup">
                        <HiX size={18} />
                    </button>
                </div>

                <div className="bbcredits-result-modal__body">
                    <div className="bbcredits-result-modal__meta">
                        <span className={`badge ${isSuccess ? 'badge-success' : 'bbcredits-badge-error'}`}>
                            HTTP {result.statusCode || 'N/A'}
                        </span>
                        {result.jobId && <span className="badge">{result.jobId}</span>}
                    </div>

                    <p className="bbcredits-result-modal__message">{result.message}</p>

                    {!isSuccess && result.detail && (
                        <div className="bbcredits-result-modal__detail">
                            <span>Detail</span>
                            <pre>{result.detail}</pre>
                        </div>
                    )}
                </div>

                <div className="modal-footer bbcredits-result-modal__footer">
                    <button type="button" className={`btn ${isSuccess ? 'btn-success' : 'btn-danger'}`} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RaiseBbCreditsPage() {
    const { currentTeam } = useTeam();
    const teamId = String(currentTeam?.id || '').trim();
    const [formValues, setFormValues] = useState({
        switch_name: '',
        port_name: '',
        bbcredits: '',
        job_id: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [resultPopup, setResultPopup] = useState(null);

    const {
        openDropdown,
        searchByField,
        menuLayoutByField,
        setOpenDropdown,
        setSearchValue,
        registerDropdownRef,
    } = useDropdownMenuState();

    const switchesQuery = useQuery({
        queryKey: ['mds-switch-names', teamId],
        queryFn: () => mainApi.getMdsSwitchNames(teamId),
        enabled: !!teamId,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const switchOptions = useMemo(() => (
        Array.isArray(switchesQuery.data) ? switchesQuery.data : []
    ), [switchesQuery.data]);

    const switchParam = useMemo(() => ({
        name: 'switch_name',
        label: 'Switch Name',
        type: 'dropdown',
        required: true,
    }), []);

    const updateField = (fieldName, value) => {
        setFormValues((prev) => ({ ...prev, [fieldName]: value }));
        setErrors((prev) => (
            prev[fieldName]
                ? { ...prev, [fieldName]: '' }
                : prev
        ));
    };

    const resetForm = () => {
        setFormValues({
            switch_name: '',
            port_name: '',
            bbcredits: '',
            job_id: '',
        });
        setErrors({});
        setOpenDropdown('');
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!String(formValues.switch_name || '').trim()) {
            nextErrors.switch_name = 'Switch name is required.';
        }
        if (!String(formValues.port_name || '').trim()) {
            nextErrors.port_name = 'Port name is required.';
        }
        if (!String(formValues.job_id || '').trim()) {
            nextErrors.job_id = 'Job ID is required.';
        }

        const bbcreditsText = String(formValues.bbcredits || '').trim();
        if (!bbcreditsText) {
            nextErrors.bbcredits = 'BB credits is required.';
        } else if (!/^\d+$/.test(bbcreditsText) || Number(bbcreditsText) <= 0) {
            nextErrors.bbcredits = 'BB credits must be a positive integer.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const response = await mainApi.modifyBbCredits({
                switch_name: String(formValues.switch_name || '').trim(),
                port_name: String(formValues.port_name || '').trim(),
                bbcredits: Number.parseInt(String(formValues.bbcredits || '').trim(), 10),
                job_id: String(formValues.job_id || '').trim(),
            });

            setResultPopup({
                type: 'success',
                statusCode: response?.statusCode,
                jobId: response?.jobId || response?.job_id || '',
                message: response?.message || 'BB credits updated successfully.',
                detail: '',
            });
        } catch (error) {
            const failure = extractRequestFailure(error);
            setResultPopup({
                type: 'error',
                statusCode: failure.statusCode,
                jobId: String(formValues.job_id || '').trim(),
                message: 'The backend rejected the request.',
                detail: failure.detail,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const switchLoadError = switchesQuery.isError
        ? (switchesQuery.error?.message || 'Failed to load MDS switch names.')
        : '';

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Raise BB Credits</h1>
                    <p className="page-subtitle">Raise BB credits on an MDS port using the main zoner API.</p>
                </div>
                <div className="page-actions">
                    <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
                        Reset
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || switchesQuery.isLoading}>
                        {submitting ? <HiRefresh size={18} className="animate-spin" /> : null}
                        Raise Credits
                    </button>
                </div>
            </div>

            <div className="page-content bbcredits-page-content">
                <div className="bbcredits-page">
                    <section className="glass-card bbcredits-info-card">
                        <div>
                            <p className="bbcredits-info-card__eyebrow">Main API Request</p>
                            <h2>/zoner/modifyBbcredits</h2>
                        </div>
                        <p>
                            Select the switch from the backend MDS list, then submit the port, BB credits value,
                            and job ID.
                        </p>
                    </section>

                    {switchLoadError && (
                        <div className="bbcredits-error-banner">
                            {switchLoadError}
                        </div>
                    )}

                    <section className="glass-card bbcredits-form-card">
                        <div className="bbcredits-form-card__header">
                            <div>
                                <p className="bbcredits-form-card__eyebrow">Request Parameters</p>
                                <h2>Raise BB credits</h2>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => void switchesQuery.refetch()}
                                disabled={switchesQuery.isFetching || !teamId}
                            >
                                <HiRefresh size={18} className={switchesQuery.isFetching ? 'animate-spin' : ''} />
                                Refresh Switches
                            </button>
                        </div>

                        <div className="bbcredits-form-grid">
                            <div className="form-group">
                                <label className="form-label">
                                    Switch Name
                                    <span className="required-star">*</span>
                                </label>
                                <ActionModalSelectField
                                    param={switchParam}
                                    values={formValues}
                                    value={formValues.switch_name}
                                    rawOptions={switchOptions}
                                    isOpen={openDropdown === 'switch_name'}
                                    searchTerm={searchByField.switch_name || ''}
                                    menuLayout={menuLayoutByField.switch_name}
                                    onChange={(value) => updateField('switch_name', value)}
                                    onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? 'switch_name' : '')}
                                    onSearchChange={(value) => setSearchValue('switch_name', value)}
                                    registerRef={(node) => registerDropdownRef('switch_name', node)}
                                />
                                {errors.switch_name && <span className="field-error">{errors.switch_name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Port Name
                                    <span className="required-star">*</span>
                                </label>
                                <input
                                    className="input-field"
                                    type="text"
                                    placeholder="Enter port name..."
                                    value={formValues.port_name}
                                    onChange={(event) => updateField('port_name', event.target.value)}
                                />
                                {errors.port_name && <span className="field-error">{errors.port_name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    BB Credits
                                    <span className="required-star">*</span>
                                </label>
                                <input
                                    className="input-field"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Enter BB credits..."
                                    value={formValues.bbcredits}
                                    onChange={(event) => updateField('bbcredits', event.target.value)}
                                />
                                {errors.bbcredits && <span className="field-error">{errors.bbcredits}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Job ID
                                    <span className="required-star">*</span>
                                </label>
                                <input
                                    className="input-field"
                                    type="text"
                                    placeholder="Enter job ID..."
                                    value={formValues.job_id}
                                    onChange={(event) => updateField('job_id', event.target.value)}
                                />
                                {errors.job_id && <span className="field-error">{errors.job_id}</span>}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <ResultPopup result={resultPopup} onClose={() => setResultPopup(null)} />
        </div>
    );
}
