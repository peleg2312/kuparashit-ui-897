import { http, runApiRequest } from './client';

export const refhaelApi = {
    async processFiles(file1, file2) {
        const formData = file1 instanceof FormData ? file1 : new FormData();
        if (!(file1 instanceof FormData)) {
            if (file1) formData.append('file1', file1);
            if (file2) formData.append('file2', file2);
        }

        return runApiRequest('refhael.processFiles', () => http.main.post('/process-excels', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }));
    },

    async downloadFile(fileName = '') {
        return runApiRequest('refhael.downloadFile', () => http.main.get('/download-file', {
            params: fileName ? { fileName } : {},
            responseType: 'blob',
        }));
    },
};
