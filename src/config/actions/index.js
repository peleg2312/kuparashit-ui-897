import dsActions from './ds';
import esxActions from './esx';
import exchActions from './exch';
import qtreeActions from './qtree';
import rdmActions from './rdm';

const actions = {
    rdm: rdmActions,
    ds: dsActions,
    esx: esxActions,
    exch: exchActions,
    qtree: qtreeActions,
};

export default actions;

export function getActionsForScreen(screenId) {
    return actions[screenId] || {};
}
