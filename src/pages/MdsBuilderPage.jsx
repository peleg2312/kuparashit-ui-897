import { useState } from 'react';
import { mainApi } from '@/api';
import MdsBuilderModal from '@/components/MdsBuilder/MdsBuilderModal';
import MdsPairCard from '@/components/MdsBuilder/MdsPairCard';
import { useMdsBuilderForm } from '@/hooks/useMdsBuilderForm';
import { mdsPairDefinitions } from '@/utils/mdsBuilderUtils';
import './MdsBuilderPage.css';

export default function MdsBuilderPage() {
    const { state, actions } = useMdsBuilderForm();

    const [modalOpen, setModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState('summary');
    const [responsePayload, setResponsePayload] = useState(null);

    const openSummary = () => {
        if (!actions.validateBeforeExecute()) return;

        setResponsePayload(null);
        setModalStep('summary');
        setModalOpen(true);
    };

    const executeBuild = async () => {
        actions.setError('');
        setModalStep('loading');
        try {
            const response = await mainApi.executeSmallMdsBuilder(state.summaryPayload);
            setResponsePayload(response);
            setModalStep('result');
        } catch (requestError) {
            setModalOpen(false);
            setModalStep('summary');
            actions.setError(requestError?.message || 'Failed to execute MDS builder request.');
        }
    };

    const closeModal = () => {
        if (modalStep === 'loading') return;
        setModalOpen(false);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">MDS Builder</h1>
                    <p className="page-subtitle">Build small/core MDS host and port configuration, then execute once.</p>
                </div>
                <div className="page-actions mds-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={actions.resetForm}>
                        Reset
                    </button>
                    <button type="button" className="btn btn-primary" onClick={openSummary}>
                        Execute
                    </button>
                </div>
            </div>

            <div className="page-content mds-page-content">
                <div className="mds-page">
                    {state.error && <div className="mds-error">{state.error}</div>}

                    <div className="mds-grid">
                        {mdsPairDefinitions.map((pair) => (
                            <MdsPairCard
                                key={pair.id}
                                pair={pair}
                                form={state.form}
                                onFieldChange={actions.updateField}
                                onPortInputChange={actions.updatePortInput}
                                onPortPairAdd={actions.addPortPair}
                                onPortPairRemove={actions.removePortPair}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <MdsBuilderModal
                isOpen={modalOpen}
                modalStep={modalStep}
                summaryPayload={state.summaryPayload}
                responsePayload={responsePayload}
                onClose={closeModal}
                onExecute={executeBuild}
            />
        </div>
    );
}
