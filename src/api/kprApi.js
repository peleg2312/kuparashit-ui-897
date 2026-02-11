import { createMockJob } from './mockData';
import { USE_MOCK_API } from './config';
import { delay } from './common';
import { kprHttp } from './httpClient';

export const kprApi = {
    async executeAction(endpoint, payload = {}) {
        if (!USE_MOCK_API) {
            const response = await kprHttp.post(endpoint, payload);
            return response.data;
        }
        await delay(800);
        return createMockJob(endpoint);
    },
};
