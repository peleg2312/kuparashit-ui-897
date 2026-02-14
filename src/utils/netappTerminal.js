export function createTerminalLine(text, tone = 'default') {
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        tone,
    };
}
