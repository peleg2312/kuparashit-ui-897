import dsActions from './ds';
import esxActions from './esx';
import exchActions from './exch';
import qtreeActions from './qtree';
import rdmActions from './rdm';
import snapmirrorActions from './snapmirror';

const actions = {
    rdm: rdmActions,
    ds: dsActions,
    esx: esxActions,
    exch: exchActions,
    qtree: qtreeActions,
    snapmirror: snapmirrorActions,
};

export default actions;

export function getActionsForScreen(screenId) {
    return actions[screenId] || {};
}
