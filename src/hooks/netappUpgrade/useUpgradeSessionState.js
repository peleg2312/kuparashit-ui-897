import { useState } from 'react';
import { DEFAULT_CREDENTIALS, DEFAULT_SESSION_INFO } from '@/config/netappUpgrade';

export function useUpgradeSessionState() {
    const [credentials, setCredentials] = useState(DEFAULT_CREDENTIALS);
    const [sessionInfo, setSessionInfo] = useState(DEFAULT_SESSION_INFO);

    const setCredentialField = (field, value) => {
        setCredentials((prev) => ({ ...prev, [field]: value }));
    };

    return {
        state: {
            credentials,
            sessionInfo,
        },
        actions: {
            setCredentialField,
            setSessionInfo,
        },
    };
}
