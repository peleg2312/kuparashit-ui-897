import {
    datastores,
    dropdownData,
    esxHosts,
    exchVolumes,
    qtrees,
    rdms,
    users,
    vcenters,
    vms,
} from './mockData';
import { USE_MOCK_API } from './config';
import { delay } from './common';
import { mainHttp } from './httpClient';

export const mainApi = {
    async getVMs() {
        if (!USE_MOCK_API) return (await mainHttp.get('/vms')).data;
        await delay();
        return vms;
    },
    async getDatastores() {
        if (!USE_MOCK_API) return (await mainHttp.get('/datastores')).data;
        await delay();
        return datastores;
    },
    async getESXHosts() {
        if (!USE_MOCK_API) return (await mainHttp.get('/esx-hosts')).data;
        await delay();
        return esxHosts;
    },
    async getRDMs() {
        if (!USE_MOCK_API) return (await mainHttp.get('/rdms')).data;
        await delay();
        return rdms;
    },
    async getVCenters() {
        if (!USE_MOCK_API) return (await mainHttp.get('/vcenters')).data;
        await delay();
        return vcenters;
    },
    async getExchVolumes() {
        if (!USE_MOCK_API) return (await mainHttp.get('/exch/volumes')).data;
        await delay();
        return exchVolumes;
    },
    async getQTrees() {
        if (!USE_MOCK_API) return (await mainHttp.get('/qtrees')).data;
        await delay();
        return qtrees;
    },
    async getUsers() {
        if (!USE_MOCK_API) return (await mainHttp.get('/users')).data;
        await delay();
        return users;
    },
    async getDropdownOptions(source, params = {}) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.get(source, { params });
            return response.data;
        }

        await delay(300);
        const staticEntry = dropdownData[source];
        if (source === '/clusters/by-vc') {
            const vc = params.vc;
            return (dropdownData[source]?.[vc] || []).slice();
        }
        if (source === '/esx/by-cluster') {
            const cluster = params.cluster;
            return (dropdownData[source]?.[cluster] || []).slice();
        }
        return Array.isArray(staticEntry) ? staticEntry.slice() : [];
    },
    async getJobStatus(jobId) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.get('/jobs/status', {
                params: { jobId },
            });
            return response.data;
        }
        await delay(200);
        return { jobId, status: 'running' };
    },
    async executeAction(endpoint, payload = {}) {
        if (!USE_MOCK_API) {
            const response = await mainHttp.post(endpoint, payload);
            return response.data;
        }
        await delay(800);
        return { jobId: `JOB-${Date.now()}`, action: endpoint, payload };
    },
};
