import ActionScreen from './Dashboard/ActionScreen';
import { exchApi } from '../api';

export default function ExchPage() {
    return (
        <ActionScreen
            screenId="exch"
            title="EXCH Volumes"
            subtitle="Exchange storage volume management"
            apiService={exchApi}
        />
    );
}
