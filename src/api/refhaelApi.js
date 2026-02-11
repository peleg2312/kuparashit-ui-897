import { USE_MOCK_API } from './config';
import { delay } from './common';
import { mainHttp } from './httpClient';

export const refhaelApi = {
    async processFiles(file1, file2) {
        const formData = file1 instanceof FormData ? file1 : new FormData();
        if (!(file1 instanceof FormData)) {
            if (file1) formData.append('file1', file1);
            if (file2) formData.append('file2', file2);
        }

        if (!USE_MOCK_API) {
            const response = await mainHttp.post('/refhael/process-files', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        }

        await delay(3000);
        return {
            success: true,
            downloadUrl: '#mock-download',
            fileName: `result_${Date.now()}.xlsx`,
        };
    },
};
