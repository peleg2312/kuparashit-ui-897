export const mdsLabels = {
    small_mds_a: 'Small MDS A',
    small_mds_b: 'Small MDS B',
    core_mds_a: 'Core MDS A',
    core_mds_b: 'Core MDS B',
};

export const mdsPairDefinitions = [
    { id: 'a', label: 'A', smallKey: 'small_mds_a', coreKey: 'core_mds_a' },
    { id: 'b', label: 'B', smallKey: 'small_mds_b', coreKey: 'core_mds_b' },
];

const mdsPairMap = Object.fromEntries(mdsPairDefinitions.map((pair) => [pair.id, pair]));

export function createInitialFormState() {
    return {
        small_mds_a: { host: '', new_hostname: '', portInput: '', port_members: [] },
        small_mds_b: { host: '', new_hostname: '', portInput: '', port_members: [] },
        core_mds_a: { host: '', portInput: '', port_members: [] },
        core_mds_b: { host: '', portInput: '', port_members: [] },
    };
}

function normalizePort(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (/^fc/i.test(trimmed)) return trimmed;
    return `fc${trimmed}`;
}

export function buildPayload(form) {
    return {
        mdss: {
            small_mds_a: {
                host: String(form.small_mds_a.host || '').trim(),
                new_hostname: String(form.small_mds_a.new_hostname || '').trim(),
                port_members: [...(form.small_mds_a.port_members || [])],
            },
            small_mds_b: {
                host: String(form.small_mds_b.host || '').trim(),
                new_hostname: String(form.small_mds_b.new_hostname || '').trim(),
                port_members: [...(form.small_mds_b.port_members || [])],
            },
            core_mds_a: {
                host: String(form.core_mds_a.host || '').trim(),
                port_members: [...(form.core_mds_a.port_members || [])],
            },
            core_mds_b: {
                host: String(form.core_mds_b.host || '').trim(),
                port_members: [...(form.core_mds_b.port_members || [])],
            },
        },
    };
}

export function addPortPairToForm(form, pairId) {
    const pair = mdsPairMap[pairId];
    if (!pair) {
        return {
            nextForm: form,
            error: 'Unknown MDS pair.',
        };
    }

    const smallSection = form[pair.smallKey] || {};
    const coreSection = form[pair.coreKey] || {};
    const smallPort = normalizePort(smallSection.portInput);
    const corePort = normalizePort(coreSection.portInput);

    if (!smallPort || !corePort) {
        return {
            nextForm: form,
            error: `MDS Pair ${pair.label}: enter both small and core ports before adding.`,
        };
    }

    const smallPorts = smallSection.port_members || [];
    const corePorts = coreSection.port_members || [];

    if (smallPorts.includes(smallPort)) {
        return {
            nextForm: form,
            error: `${mdsLabels[pair.smallKey]}: port ${smallPort} already exists.`,
        };
    }

    if (corePorts.includes(corePort)) {
        return {
            nextForm: form,
            error: `${mdsLabels[pair.coreKey]}: port ${corePort} already exists.`,
        };
    }

    return {
        nextForm: {
            ...form,
            [pair.smallKey]: {
                ...smallSection,
                portInput: '',
                port_members: [...smallPorts, smallPort],
            },
            [pair.coreKey]: {
                ...coreSection,
                portInput: '',
                port_members: [...corePorts, corePort],
            },
        },
        error: '',
    };
}

export function removePortPairFromForm(form, pairId, indexToRemove) {
    const pair = mdsPairMap[pairId];
    if (!pair) return form;

    const smallSection = form[pair.smallKey] || {};
    const coreSection = form[pair.coreKey] || {};
    const smallPorts = smallSection.port_members || [];
    const corePorts = coreSection.port_members || [];

    if (indexToRemove < 0 || indexToRemove >= Math.max(smallPorts.length, corePorts.length)) {
        return form;
    }

    return {
        ...form,
        [pair.smallKey]: {
            ...smallSection,
            port_members: smallPorts.filter((_, index) => index !== indexToRemove),
        },
        [pair.coreKey]: {
            ...coreSection,
            port_members: corePorts.filter((_, index) => index !== indexToRemove),
        },
    };
}

export function validateForm(form) {
    const errors = [];
    Object.entries(form).forEach(([mdsKey, section]) => {
        if (!String(section.host || '').trim()) {
            const hostLabel = mdsKey.startsWith('small_') ? 'IP' : 'host';
            errors.push(`${mdsLabels[mdsKey]}: ${hostLabel} is required.`);
        }
        if (mdsKey.startsWith('small_') && !String(section.new_hostname || '').trim()) {
            errors.push(`${mdsLabels[mdsKey]}: new hostname is required.`);
        }
    });

    mdsPairDefinitions.forEach((pair) => {
        const smallPorts = form[pair.smallKey]?.port_members || [];
        const corePorts = form[pair.coreKey]?.port_members || [];

        if (!smallPorts.length || !corePorts.length) {
            errors.push(`MDS Pair ${pair.label}: add at least one mapped small/core port pair.`);
        }

        if (smallPorts.length !== corePorts.length) {
            errors.push(`MDS Pair ${pair.label}: small and core must have the same amount of ports.`);
        }
    });

    return errors;
}

export function formatResponse(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}
