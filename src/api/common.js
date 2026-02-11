import { MOCK_DELAY } from './config';

export function delay(ms = MOCK_DELAY) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
