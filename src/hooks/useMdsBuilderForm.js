import { useMemo, useState } from 'react';
import {
    addPortPairToForm,
    buildPayload,
    createInitialFormState,
    removePortPairFromForm,
    validateForm,
} from '@/utils/mdsBuilderUtils';

export function useMdsBuilderForm() {
    const [form, setForm] = useState(createInitialFormState);
    const [error, setError] = useState('');

    const summaryPayload = useMemo(() => buildPayload(form), [form]);

    const resetForm = () => {
        setForm(createInitialFormState());
        setError('');
    };

    const updateField = (mdsKey, field, value) => {
        setForm((prev) => ({
            ...prev,
            [mdsKey]: {
                ...prev[mdsKey],
                [field]: value,
            },
        }));
    };

    const updatePortInput = (mdsKey, value) => {
        setForm((prev) => ({
            ...prev,
            [mdsKey]: {
                ...prev[mdsKey],
                portInput: value,
            },
        }));
    };

    const addPortPair = (pairId) => {
        let operationError = '';

        setForm((prev) => {
            const { nextForm, error: addError } = addPortPairToForm(prev, pairId);
            operationError = addError;
            return nextForm;
        });

        if (operationError) {
            setError(operationError);
            return;
        }

        setError('');
    };

    const removePortPair = (pairId, indexToRemove) => {
        setForm((prev) => removePortPairFromForm(prev, pairId, indexToRemove));
        setError('');
    };

    const validateBeforeExecute = () => {
        const issues = validateForm(form);
        if (issues.length) {
            setError(issues[0]);
            return false;
        }
        setError('');
        return true;
    };

    return {
        state: {
            form,
            error,
            summaryPayload,
        },
        actions: {
            setError,
            resetForm,
            updateField,
            updatePortInput,
            addPortPair,
            removePortPair,
            validateBeforeExecute,
        },
    };
}
