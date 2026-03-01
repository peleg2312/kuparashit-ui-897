import { http, runApiRequest } from './client';

const STATUS_KEYS = ['status', 'state', 'result', 'health', 'machine_status'];
const MACHINE_NAME_KEYS = ['machine', 'machine_name', 'name', 'host', 'hostname', 'node'];
const MACHINE_TYPE_KEYS = ['type', 'machine_type', 'kind', 'platform', 'storage_type'];
const MACHINE_SID_KEYS = ['sid', 'serial', 'serial_id', 'serial_number', 'symm_id'];
const WRAPPER_KEYS = ['machines', 'data', 'results', 'content', 'items'];

const TEAM_API_CONFIG = {
    BLOCK: {
        httpClient: http.proactiveBlock,
        endpoint: '/proactive/',
    },
    NASA: {
        httpClient: http.proactiveNasa,
        endpoint: '/proactive/',
    },
};

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pickFirstString(value, keys) {
    if (!isPlainObject(value)) return '';
    for (const key of keys) {
        const candidate = String(value[key] || '').trim();
        if (candidate) return candidate;
    }
    return '';
}

function pickFirstDefined(value, keys) {
    if (!isPlainObject(value)) return undefined;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            return value[key];
        }
    }
    return undefined;
}

function normalizeStatus(statusValue) {
    const raw = String(statusValue ?? '').trim();
    if (!raw) {
        return { raw: 'UNKNOWN', isOk: false };
    }

    const upper = raw.toUpperCase();
    const isError = /(ERROR|FAILED|FAIL|CRITICAL|DOWN|ALERT)/.test(upper);
    const isOk = /(OK|SUCCESS|HEALTHY|PASS|UP|NORMAL)/.test(upper) && !isError;

    return {
        raw: raw.toUpperCase(),
        isOk,
    };
}

function unwrapPayload(raw) {
    if (!isPlainObject(raw)) return raw;

    for (const key of WRAPPER_KEYS) {
        const next = raw[key];
        if (isPlainObject(next) || Array.isArray(next)) return next;
    }

    return raw;
}

function looksLikeSingleMachine(value) {
    if (!isPlainObject(value)) return false;
    const hasStatus = STATUS_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    const hasType = MACHINE_TYPE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    const hasMachineName = MACHINE_NAME_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    return hasStatus || hasType || hasMachineName;
}

function toMachineEntries(raw) {
    const payload = unwrapPayload(raw);

    if (Array.isArray(payload)) {
        return payload.map((item, index) => {
            if (isPlainObject(item)) {
                const name = pickFirstString(item, MACHINE_NAME_KEYS) || `Machine ${index + 1}`;
                return [name, item];
            }
            return [`Machine ${index + 1}`, { value: item }];
        });
    }

    if (!isPlainObject(payload)) {
        return [];
    }

    if (looksLikeSingleMachine(payload)) {
        const name = pickFirstString(payload, MACHINE_NAME_KEYS) || 'Machine';
        return [[name, payload]];
    }

    return Object.entries(payload);
}

function buildErrorPayload(details) {
    if (!isPlainObject(details)) {
        return details;
    }

    const selected = {};
    const detailKeys = ['error', 'errors', 'failures', 'checks', 'issues', 'messages', 'details'];
    detailKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(details, key)) return;
        selected[key] = details[key];
    });

    const sid = pickFirstString(details, MACHINE_SID_KEYS);
    if (sid && !Object.prototype.hasOwnProperty.call(selected, 'sid')) {
        selected.sid = sid;
    }

    return Object.keys(selected).length ? selected : details;
}

function normalizeMachine(machineName, details) {
    const safeDetails = isPlainObject(details) ? details : { value: details };
    const type = pickFirstString(safeDetails, MACHINE_TYPE_KEYS) || 'Unknown';
    const sid = pickFirstString(safeDetails, MACHINE_SID_KEYS);
    const statusValue = pickFirstDefined(safeDetails, STATUS_KEYS);
    const status = normalizeStatus(statusValue);

    return {
        name: String(machineName || pickFirstString(safeDetails, MACHINE_NAME_KEYS) || 'Machine').trim(),
        type,
        sid,
        status: status.raw,
        isOk: status.isOk,
        payload: safeDetails,
        errorPayload: buildErrorPayload(safeDetails),
    };
}

export const proactiveApi = {
    async runScan({ teamId } = {}) {
        const safeTeamId = String(teamId || '').trim().toUpperCase();
        const config = TEAM_API_CONFIG[safeTeamId];

        if (!config) {
            throw new Error('Proactive is supported only for BLOCK and NASA teams.');
        }

        return runApiRequest('proactive.runScan', async () => {
            const raw = await config.httpClient.get(config.endpoint);

            const machines = toMachineEntries(raw?.data ?? raw).map(([machineName, details]) => (
                normalizeMachine(machineName, details)
            ));

            machines.sort((a, b) => {
                if (a.isOk !== b.isOk) return a.isOk ? 1 : -1;
                return a.name.localeCompare(b.name);
            });

            return machines;
        });
    },
};
