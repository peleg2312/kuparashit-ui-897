import ActionScreen from './Dashboard/ActionScreen';
import { kprApi } from '../api';

export default function QtreePage() {
    return (
        <ActionScreen
            screenId="qtree"
            title="QTREE Management"
            subtitle="Quota tree management for NAS storage"
            apiService={kprApi}
        />
    );
}
