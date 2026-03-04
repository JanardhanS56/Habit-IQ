/**
 * export.js — CSV export and encrypted export
 */
import { encryptData } from './encryption.js';

/**
 * Build a CSV string from activities and logs
 */
export function buildCSV(activities, logs) {
    const header = ['Activity', 'Type', 'Category', 'Date', 'Value', 'Sessions', 'Notes'];
    const actMap = {};
    for (const a of activities) actMap[a.id] = a;

    const rows = logs.map(log => {
        const act = actMap[log.activityId];
        if (!act) return null;
        const sessions = (log.sessions || []).map(s => s + 'min').join(';');
        return [
            `"${act.name}"`,
            act.type,
            act.category || '',
            log.date,
            log.value,
            sessions,
            `"${(log.notes || '').replace(/"/g, '""')}"`
        ].join(',');
    }).filter(Boolean);

    return [header.join(','), ...rows].join('\n');
}

/**
 * Trigger a file download
 */
function downloadFile(content, filename, type = 'text/csv') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Export plain CSV
 */
export function exportCSV(activities, logs) {
    const csv = buildCSV(activities, logs);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `habitiq-export-${date}.csv`);
}

/**
 * Export AES-encrypted JSON bundle
 */
export async function exportEncrypted(activities, logs, categories, password) {
    const payload = JSON.stringify({ activities, logs, categories, exportedAt: new Date().toISOString() });
    const encrypted = await encryptData(payload, password);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(encrypted, `habitiq-encrypted-${date}.habitiq`, 'text/plain');
}
