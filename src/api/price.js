import { http, runApiRequest } from './client';

export const priceApi = {
    async calculate(machineType, params) {
        return runApiRequest('price.calculate', () => http.main.post('/price/calculate', { machineType, ...params }));
    },
};
