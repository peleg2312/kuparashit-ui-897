import { http, runApiRequest } from './client';

export const troubleshooterApi = {
    async byVCenter(vcName) {
        return runApiRequest('troubleshooter.byVCenter', () => http.troubleshooter.post('/vc', {
            vc_name: String(vcName || '').trim(),
        }));
    },

    async byNetapp(netappName) {
        return runApiRequest('troubleshooter.byNetapp', () => http.troubleshooter.post('/netapp', {
            netapp_name: String(netappName || '').trim(),
        }));
    },

    async byNaas(naas = []) {
        const normalizedNaas = Array.isArray(naas)
            ? naas.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

        return runApiRequest('troubleshooter.byNaas', () => http.troubleshooter.post('/naas', {
            naas: normalizedNaas,
        }));
    },
};
