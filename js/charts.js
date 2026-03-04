/**
 * charts.js — Chart.js chart management
 * Daily bar, Weekly bar, Category doughnut
 */

let dailyChart = null;
let weeklyChart = null;
let categoryChart = null;

const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(26,26,46,0.95)',
            titleColor: '#f0f0fa',
            bodyColor: '#9090b0',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10
        }
    }
};

function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
}
function gridColor() { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }
function tickColor() { return isDark() ? '#555570' : '#9494b0'; }

export function renderDailyChart(labels, data, color = '#6366f1', label = 'Activity') {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    if (dailyChart) dailyChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, color + 'cc');
    gradient.addColorStop(1, color + '11');

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: gradient,
                borderColor: color,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
                hoverBackgroundColor: color + 'ee'
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                x: {
                    grid: { color: gridColor() },
                    ticks: { color: tickColor(), font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor() },
                    ticks: { color: tickColor(), font: { size: 11 } }
                }
            },
            plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: { display: true, labels: { color: isDark() ? '#f0f0fa' : '#111128', font: { size: 11 } } }
            }
        }
    });
}

export function renderWeeklyChart(labels, data) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    if (weeklyChart) weeklyChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, '#a855f7cc');
    gradient.addColorStop(1, '#a855f711');

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Completions',
                data,
                backgroundColor: gradient,
                borderColor: '#a855f7',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                x: { grid: { color: gridColor() }, ticks: { color: tickColor(), font: { size: 11 } } },
                y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: tickColor(), font: { size: 11 }, stepSize: 1 } }
            },
            plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: { display: true, labels: { color: isDark() ? '#f0f0fa' : '#111128', font: { size: 11 } } }
            }
        }
    });
}

export function renderCategoryChart(labels, data, colors) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();

    if (!labels.length || data.every(v => v === 0)) {
        // Draw empty state message
        categoryChart = null;
        return;
    }

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: isDark() ? '#1a1a2e' : '#ffffff',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: isDark() ? '#9090b0' : '#44446a',
                        font: { size: 11 },
                        padding: 12,
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 4
                    }
                }
            },
            cutout: '65%'
        }
    });
}

export function destroyAllCharts() {
    if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
    if (weeklyChart) { weeklyChart.destroy(); weeklyChart = null; }
    if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
}
