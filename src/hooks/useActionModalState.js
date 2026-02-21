import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyFieldChange, validateActionValues } from '../utils/actionModal/formState';
import { isParamVisible } from '../utils/visibilityRules';
import {
    buildDropdownDependencyKey,
    buildInitialValues,
} from './actionModal/actionModalHelpers';
import { useActionDropdownOptions } from './actionModal/useActionDropdownOptions';
import { useDropdownMenuState } from './actionModal/useDropdownMenuState';

/**
 * Encapsulates ActionModal form state, validation and dropdown interaction state.
 *
 * @param {object} params
 * @param {object} params.action
 * @param {object} params.initialValues
 * @param {(values: object) => Promise<void>} params.onSubmit
 */
export function useActionModalState({ action, initialValues, onSubmit }) {
    const [values, setValues] = useState(() => buildInitialValues(action, initialValues));
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const dropdownDependencyKey = useMemo(
        () => buildDropdownDependencyKey(action, values),
        [action, values],
    );

    const {
        dropdownOptions,
        setDropdownOptions,
    } = useActionDropdownOptions({
        action,
        dropdownDependencyKey,
        values,
    });

    const {
        openDropdown,
        searchByField,
        menuLayoutByField,
        setOpenDropdown,
        setSearchValue,
        registerDropdownRef,
        resetDropdownUiState,
    } = useDropdownMenuState();

    useEffect(() => {
        setValues(buildInitialValues(action, initialValues));
        setDropdownOptions({});
        setErrors({});
        setSubmitError('');
        resetDropdownUiState();
    }, [action, initialValues, resetDropdownUiState, setDropdownOptions]);

    const visibleParams = useMemo(
        () => (action ? action.params.filter((param) => isParamVisible(param, values)) : []),
        [action, values],
    );

    const handleChange = useCallback((name, value) => {
        if (!action?.params) return;
        setValues((prev) => applyFieldChange(prev, action, name, value));
        setErrors((prev) => (
            prev[name]
                ? { ...prev, [name]: null }
                : prev
        ));
    }, [action]);

    const validate = useCallback(() => {
        if (!action?.params) return true;
        const nextErrors = validateActionValues(action, values);
        setErrors(nextErrors);
        setSubmitError('');
        return Object.keys(nextErrors).length === 0;
    }, [action, values]);

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await onSubmit(values);
            setSubmitError('');
        } catch (error) {
            setSubmitError(error?.message || 'Action request failed');
        } finally {
            setSubmitting(false);
        }
    }, [onSubmit, validate, values]);

    return {
        form: {
            values,
            errors,
            visibleParams,
            submitError,
            submitting,
        },
        dropdown: {
            openDropdown,
            searchByField,
            menuLayoutByField,
            dropdownOptions,
        },
        actions: {
            handleChange,
            handleSubmit,
            setOpenDropdown,
            setSearchValue,
            registerDropdownRef,
        },
    };
}
