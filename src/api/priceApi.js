import { priceCalculator } from './mockData';
import { USE_MOCK_API } from './config';
import { delay } from './common';
import { mainHttp } from './httpClient';

export const priceApi = {
    async calculate(machineType, params) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.post('/price/calculate', { machineType, ...params });
            return response.data;
        }
        await delay(1200);
        const calc = priceCalculator[machineType];
        if (calc) return calc(params);
        return { price: '0.00', error: 'Unknown machine type' };
    },
};
