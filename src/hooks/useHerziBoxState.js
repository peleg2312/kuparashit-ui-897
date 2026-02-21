import { useMemo, useState } from 'react';
import { herziApi } from '@/api';
import { buildInputPlaceholder, buildMultiResultState } from '@/utils/herziToolUtils';
import { copyListToClipboard, copyTextToClipboard } from '@/utils/clipboardHandlers';
import { buildHerziQueryUrl, formatHerziToolResult, parseHerziInputList } from '@/utils/herziHandlers';
import { useTimedToast } from './useTimedToast';

/**
 * Encapsulates Dynamic Herzi box UI state and actions.
 *
 * @param {object} box
 */
export function useHerziBoxState(box) {
    const [input, setInput] = useState('');
    const [resultState, setResultState] = useState(null);
    const [loading, setLoading] = useState(false);
    const { toastMessage, toastType, showToast, hideToast } = useTimedToast(2400);

    const inputPlaceholder = useMemo(() => buildInputPlaceholder(box.inputLabel), [box.inputLabel]);

    const closeResult = () => setResultState(null);

    const handleCopyResult = async (value, successMessage = 'Copied result') => {
        try {
            const copied = await copyTextToClipboard(String(value || '').trim());
            if (!copied) {
                showToast('Nothing to copy', 'error');
                return;
            }
            showToast(successMessage, 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    const handleCopyList = async (list) => {
        try {
            const result = await copyListToClipboard(list);
            if (!result.copied) {
                showToast('Nothing to copy', 'error');
                return;
            }
            showToast(`Copied ${result.count} results`, 'success');
        } catch {
            showToast('Copy failed', 'error');
        }
    };

    const handleSubmit = async () => {
        if (loading) return;
        const inputItems = parseHerziInputList(input);
        if (!inputItems.length) return;

        setLoading(true);

        try {
            if (inputItems.length === 1) {
                const singleItem = inputItems[0];
                const response = await herziApi.query(box.endpoint, singleItem);
                setResultState({
                    mode: 'single',
                    item: singleItem,
                    result: formatHerziToolResult(response),
                    responseUrl: buildHerziQueryUrl(box.endpoint, singleItem),
                });
                return;
            }

            const response = await herziApi.query(box.endpoint, inputItems);
            const { items, resultsByItem } = buildMultiResultState(inputItems, response);
            const responseUrlsByItem = {};
            inputItems.forEach((item) => {
                responseUrlsByItem[item] = buildHerziQueryUrl(box.endpoint, item);
            });

            setResultState({
                mode: 'multi',
                items,
                resultsByItem,
                responseUrlsByItem,
                queryUrl: buildHerziQueryUrl(box.endpoint, inputItems),
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        state: {
            input,
            resultState,
            loading,
            inputPlaceholder,
        },
        toast: {
            message: toastMessage,
            type: toastType,
            hide: hideToast,
        },
        actions: {
            setInput,
            closeResult,
            handleCopyResult,
            handleCopyList,
            handleSubmit,
        },
    };
}
