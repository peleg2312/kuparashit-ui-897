export function pickFileFromEvent(event) {
    return event?.dataTransfer?.files?.[0] || event?.target?.files?.[0] || null;
}

export function createResultDownload(fileName, content = 'Mock Excel content') {
    const blob = new Blob([content], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName || 'result.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
}
