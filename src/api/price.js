import { http, runApiRequest } from './client';

const pricePathByType = {
    NETAPP: 'netapp',
    PMAX: 'powermax',
    PFLEX: 'powerflex',
};

export const priceApi = {
    async calculate(machineType, params) {
        const pathToken = pricePathByType[String(machineType || '').toUpperCase()] || String(machineType || '').toLowerCase();
        return runApiRequest('price.calculate', () => http.main.get(`/calculate-storage/${pathToken}`, {
            params: {
                machineType,
                ...params,
            },
        }));
    },
};
