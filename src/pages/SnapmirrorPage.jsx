import ActionScreen from './Dashboard/ActionScreen';
import { kprApi } from '../api';

export default function SnapmirrorPage() {
    return (
        <ActionScreen
            screenId="snapmirror"
            title="SnapMirror Management"
            subtitle="Create, break, and delete SnapMirror relationships"
            apiService={kprApi}
        />
    );
}
