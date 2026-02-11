import { herziMockResults } from './mockData';
import { USE_MOCK_API } from './config';
import { delay } from './common';
import { mainHttp } from './httpClient';

export const herziApi = {
    async query(endpoint, input) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.post(endpoint, { input });
            return response.data;
        }
        await delay(1000);
        const handler = herziMockResults[endpoint];
        if (handler) return handler(input);
        return 'No data found';
    },
};
