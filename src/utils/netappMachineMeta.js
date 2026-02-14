export function normalizeNetappMachine(machine, index = 0) {
    if (typeof machine === 'string') {
        const name = machine.trim() || `machine-${index + 1}`;
        return {
            id: `machine-${index}-${name}`,
            name,
        };
    }

    const rawName = machine?.name
        || machine?.hostname
        || machine?.host
        || machine?.ip
        || machine?.address
        || `machine-${index + 1}`;

    const name = String(rawName).trim() || `machine-${index + 1}`;

    return {
        id: machine?.id || `machine-${index}-${name}`,
        name,
    };
}
