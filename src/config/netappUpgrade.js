export const UPGRADE_COMMAND_DICT = {
    precheck_versions: 'system node image show',
    validate_health: 'cluster show -fields health,eligibility',
    download_package: 'system node image update -package-url http://repo/ontap_9_14_1.tgz',
    install_package: 'system node image update -install true',
    start_upgrade: 'cluster image update -version 9.14.1',
    postcheck_status: 'cluster image show-update-progress',
};

export const DEFAULT_CREDENTIALS = {
    username: 'admin',
    password: '',
    machine: '',
};

export const DEFAULT_SESSION_INFO = {
    connected: false,
    machine: '',
};

export const INITIAL_COMMANDS = Object.values(UPGRADE_COMMAND_DICT).map((command, index) => ({
    id: `upgrade-${index + 1}`,
    command,
    status: 'idle',
}));

export function updateCommandStatus(commands, commandId, status) {
    return commands.map((command) => (
        command.id === commandId
            ? { ...command, status }
            : command
    ));
}

export function createNewCommand(index) {
    return {
        id: `upgrade-user-${Date.now()}-${index}`,
        command: '',
        status: 'idle',
    };
}
