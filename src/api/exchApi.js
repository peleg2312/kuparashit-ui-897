import { createMockJob } from './mockData';
import { USE_MOCK_API } from './config';
import { delay } from './common';
import { exchHttp } from './httpClient';

export const exchApi = {
    async executeAction(endpoint, payload = {}) {
        if (!USE_MOCK_API) {
            const response = await exchHttp.post(endpoint, payload);
            return response.data;
        }
        await delay(800);
        return createMockJob(endpoint);
    },
};
