function isEmpty(value) {
    return value === undefined
        || value === null
        || value === ''
        || (Array.isArray(value) && value.length === 0);
}

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function inferPrefillSources(paramName) {
    const name = String(paramName || '').toLowerCase();
    if (name === 'vc' || name === 'vc_name' || name.includes('vcenter')) return ['vc', 'vcenter'];
    if (name.includes('dscluster') || name.includes('ds_cluster')) return ['ds_cluster', 'cluster'];
    if (name.includes('esxcluster') || name.includes('esx_cluster')) return ['esx_cluster', 'cluster'];
    if (name.includes('naa')) return ['naa'];
    if (name.includes('esxname') || name === 'hosts') return ['name'];
    if (name.includes('dsname') || name.includes('datastore')) return ['name', 'datastore'];
    if (name.includes('oracle')) return ['name'];
    if (name.includes('name')) return ['name'];
    return [];
}

function pickValue(row, sources) {
    for (const source of sources) {
        const value = row?.[source];
        if (!isEmpty(value)) return value;
    }
    return undefined;
}

function uniqueList(values) {
    return [...new Set(values.filter((value) => !isEmpty(value)))];
}

/**
 * Compute initial modal values from selected table rows using action config prefill metadata.
 *
 * @param {object} action
 * @param {Array<object>} selectedRows
 * @returns {object}
 */
export function buildActionInitialValues(action, selectedRows) {
    if (!action || !selectedRows.length) return {};

    const values = {};

    action.params.forEach((param) => {
        const sources = param.prefillFrom ? asArray(param.prefillFrom) : inferPrefillSources(param.name);
        if (!sources.length) return;

        const mode = param.prefillMode || (param.multi ? 'list' : 'first');
        if (mode === 'list') {
            const list = uniqueList(selectedRows.map((row) => pickValue(row, sources)));
            if (list.length) {
                values[param.name] = param.multi ? list : list[0];
            }
            return;
        }

        const firstValue = selectedRows
            .map((row) => pickValue(row, sources))
            .find((value) => !isEmpty(value));
        if (!isEmpty(firstValue)) {
            values[param.name] = firstValue;
        }
    });

    return values;
}

export const buildDeleteInitialValues = buildActionInitialValues;
