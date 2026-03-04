/**
 * heatmap.js — Monthly GitHub-style blue heatmap renderer
 */

/**
 * Render heatmap for a given month.
 * @param {Array} data - Array of { date, value, level } from metrics.getHeatmapData
 * @param {string} yearMonth - "YYYY-MM"
 */
export function renderHeatmap(data, yearMonth) {
    const container = document.getElementById('heatmap');
    container.innerHTML = '';

    if (!data || !data.length) {
        container.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">No data for this month.</span>';
        return;
    }

    const [year, month] = yearMonth.split('-').map(Number);
    // Find day-of-week for the 1st (0=Sun ... 6=Sat, we want Mon-first)
    const firstDay = new Date(year, month - 1, 1);
    let startOffset = firstDay.getDay(); // 0=Sun
    startOffset = startOffset === 0 ? 6 : startOffset - 1; // Convert to Mon=0

    // Add blank cells before 1st
    for (let i = 0; i < startOffset; i++) {
        const blank = document.createElement('div');
        blank.className = 'heat-cell level-0';
        blank.style.opacity = '0';
        container.appendChild(blank);
    }

    for (const day of data) {
        const cell = document.createElement('div');
        cell.className = `heat-cell level-${day.level}`;
        const d = new Date(day.date + 'T00:00:00');
        cell.title = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.value}`;
        container.appendChild(cell);
    }
}

/**
 * Populate the month selector with the past 12 months
 */
export function populateMonthSelector(selectEl) {
    selectEl.innerHTML = '';
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (i === 0) opt.selected = true;
        selectEl.appendChild(opt);
    }
}
