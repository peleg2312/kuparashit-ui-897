import { exchApi, kprApi, mainApi } from '../../api';

const apiByName = {
    main: mainApi,
    kpr: kprApi,
    exch: exchApi,
};

export function resolveActionApi(action, apiService) {
    return apiByName[action?.api] || apiService || kprApi;
}

export function resolveActionEndpoint(action, values = {}) {
    if (!action) return '';
    const selectorField = action.endpointSelector;
    const endpointMap = action.endpointByValue;
    if (selectorField && endpointMap && typeof endpointMap === 'object') {
        const selectorValue = values?.[selectorField];
        if (selectorValue && endpointMap[selectorValue]) {
            return endpointMap[selectorValue];
        }
    }
    return action.endpoint;
}
