import { http, runApiRequest } from './client';

export const mainApi = {
    async getVMs() {
        return runApiRequest('main.getVMs', () => http.main.get('/vms'));
    },
    async getDatastores() {
        return runApiRequest('main.getDatastores', () => http.main.get('/datastores'));
    },
    async getESXHosts() {
        return runApiRequest('main.getESXHosts', () => http.main.get('/esx-hosts'));
    },
    async getRDMs() {
        return runApiRequest('main.getRDMs', () => http.main.get('/rdms'));
    },
    async getVCenters() {
        return runApiRequest('main.getVCenters', () => http.main.get('/vcenters'));
    },
    async getNetappMachines() {
        return runApiRequest('main.getNetappMachines', () => http.main.get('/netapp/machines'));
    },
    async getExchVolumes() {
        return runApiRequest('main.getExchVolumes', () => http.main.get('/exch/volumes'));
    },
    async getQTrees() {
        return runApiRequest('main.getQTrees', () => http.main.get('/qtrees'));
    },
    async getDropdownOptions(source, params = {}) {
        return runApiRequest('main.getDropdownOptions', () => http.main.get(source, { params }));
    },
    async getJobStatus(jobId) {
        return runApiRequest('main.getJobStatus', () => http.main.get('/jobs/status', { params: { jobId } }));
    },
    async executeAction(endpoint, payload = {}) {
        return runApiRequest('main.executeAction', () => http.main.post(endpoint, payload));
    },
};
