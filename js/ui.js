/**
 * ui.js — UI rendering, modals, forms, views, theme
 */
import * as DB from './db.js';
import * as Metrics from './metrics.js';
import * as Charts from './charts.js';
import * as Heatmap from './heatmap.js';
import { exportCSV, exportEncrypted } from './export.js';

/* ═══════════════════ STATE ═══════════════════ */
let state = {
    activities: [],
    logs: [],
    categories: [],
    logMap: {},
    currentView: 'dashboard',
    editingActivityId: null,
    deletingActivityId: null,
    sessionContext: { activityId: null, date: null }, // for session modal
    pastEditLock: false
};

/* ═══════════════════ INIT ═══════════════════ */
export async function initUI() {
    await loadState();
    setupNavigation();
    setupSidebar();
    setupTheme();
    setupModals();
    setupActivityForm();
    setupLogView();
    setupTopbarActions();
    renderAll();
}

async function loadState() {
    await DB.openDB();
    [state.activities, state.logs, state.categories] = await Promise.all([
        DB.getAllActivities(),
        DB.getAllLogs(),
        DB.getAllCategories()
    ]);
    state.logMap = Metrics.buildLogMap(state.logs);
    state.pastEditLock = await DB.getSetting('pastEditLock', false);
}

async function reloadState() {
    [state.activities, state.logs, state.categories] = await Promise.all([
        DB.getAllActivities(),
        DB.getAllLogs(),
        DB.getAllCategories()
    ]);
    state.logMap = Metrics.buildLogMap(state.logs);
}

/* ═══════════════════ NAVIGATION ═══════════════════ */
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    state.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    const titles = { dashboard: 'Dashboard', activities: 'Activities', log: 'Log Entry', streaks: 'Streaks & Records', settings: 'Settings' };
    document.getElementById('viewTitle').textContent = titles[view] || view;

    if (view === 'dashboard') renderDashboard();
    if (view === 'activities') renderActivitiesList();
    if (view === 'log') renderLogView();
    if (view === 'streaks') renderStreaks();
    if (view === 'settings') renderSettings();
}

/* ═══════════════════ SIDEBAR ═══════════════════ */
function setupSidebar() {
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
}

/* ═══════════════════ THEME ═══════════════════ */
function setupTheme() {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    root.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = root.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
        // Re-render charts to update colors
        renderDashboard();
    });
}
function updateThemeIcon(theme) {
    document.getElementById('themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';
}

/* ═══════════════════ MODALS ═══════════════════ */
function setupModals() {
    document.querySelectorAll('.modal-close,[data-modal]').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.modal;
            if (id) closeModal(id);
        });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
}

export function openModal(id) {
    document.getElementById(id)?.classList.add('open');
}
export function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

/* ═══════════════════ TOPBAR ACTIONS ═══════════════════ */
function setupTopbarActions() {
    document.getElementById('addActivityBtn').addEventListener('click', () => openAddActivity());
    document.getElementById('exportCSVBtn').addEventListener('click', async () => {
        await reloadState();
        exportCSV(state.activities, state.logs);
        showToast('CSV exported!', 'success');
    });
}

/* ═══════════════════ ACTIVITY FORM ═══════════════════ */
function openAddActivity() {
    state.editingActivityId = null;
    document.getElementById('activityModalTitle').textContent = 'New Activity';
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityColor').value = '#6366f1';
    populateCategorySelect('activityCategory');
    openModal('activityModal');
}

function openEditActivity(id) {
    const act = state.activities.find(a => a.id === id);
    if (!act) return;
    state.editingActivityId = id;
    document.getElementById('activityModalTitle').textContent = 'Edit Activity';
    document.getElementById('activityId').value = id;
    document.getElementById('activityName').value = act.name;
    document.getElementById('activityType').value = act.type;
    document.getElementById('activityDailyTarget').value = act.dailyTarget || 1;
    document.getElementById('activityWeeklyTarget').value = act.weeklyTarget || '';
    document.getElementById('activityColor').value = act.color || '#6366f1';
    populateCategorySelect('activityCategory', act.category);
    openModal('activityModal');
}

function setupActivityForm() {
    const typeSelect = document.getElementById('activityType');
    typeSelect.addEventListener('change', () => {
        const unit = typeSelect.value === 'binary' ? '(done = 1)' : '(minutes)';
        document.getElementById('targetUnit').textContent = unit;
    });

    document.getElementById('activityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('activityId').value;
        const data = {
            name: document.getElementById('activityName').value.trim(),
            type: document.getElementById('activityType').value,
            category: document.getElementById('activityCategory').value,
            dailyTarget: Number(document.getElementById('activityDailyTarget').value) || 1,
            weeklyTarget: Number(document.getElementById('activityWeeklyTarget').value) || null,
            color: document.getElementById('activityColor').value,
            createdAt: id ? undefined : new Date().toISOString()
        };
        if (!data.name) return showToast('Activity name is required', 'error');

        if (id) {
            data.id = Number(id);
            await DB.updateActivity(data);
            showToast('Activity updated!', 'success');
        } else {
            await DB.addActivity(data);
            showToast('Activity added!', 'success');
        }
        closeModal('activityModal');
        await reloadState();
        renderAll();
    });
}

/* ═══════════════════ RENDER DASHBOARD ═══════════════════ */
async function renderDashboard() {
    await reloadState();
    renderMetrics();
    renderDailyChartSection();
    renderWeeklyChartSection();
    renderCategoryChartSection();
    renderHeatmapSection();
}

function renderMetrics() {
    const { activities, logMap } = state;
    const { consistency, adherence, streakDom, productivity } = Metrics.calcAllMetrics(activities, logMap);
    document.getElementById('val-consistency').textContent = `${consistency}%`;
    document.getElementById('val-adherence').textContent = `${adherence}%`;
    document.getElementById('val-streak-dom').textContent = `${streakDom}%`;
    document.getElementById('val-productivity').textContent = `${productivity}`;
}

function renderDailyChartSection() {
    const { activities, logMap } = state;
    const select = document.getElementById('dailyChartActivity');
    // Populate selector
    select.innerHTML = '';
    if (!activities.length) {
        select.innerHTML = '<option>No activities</option>';
        Charts.renderDailyChart([], []);
        return;
    }
    activities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        select.appendChild(opt);
    });

    const drawDaily = () => {
        const actId = Number(select.value);
        const act = activities.find(a => a.id === actId);
        if (!act) return;
        const dates = Metrics.getDateRange(7);
        const labels = dates.map(d => {
            const dd = new Date(d + 'T00:00:00');
            return dd.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        });
        const data = Metrics.getDailyValues(act, logMap, 7);
        Charts.renderDailyChart(labels, data, act.color || '#6366f1', act.name);
    };

    select.addEventListener('change', drawDaily);
    drawDaily();
}

function renderWeeklyChartSection() {
    const { activities, logMap } = state;
    const weekData = Metrics.getWeeklyData(activities, logMap, 8);
    Charts.renderWeeklyChart(weekData.map(w => w.label), weekData.map(w => w.value));
}

function renderCategoryChartSection() {
    const { activities, logMap, categories } = state;
    const breakdown = Metrics.getCategoryBreakdown(activities, logMap, categories);
    const labels = [], data = [], colors = [];

    for (const cat of categories) {
        const val = breakdown[cat.id] || 0;
        if (val > 0) { labels.push(cat.name); data.push(val); colors.push(cat.color || '#6366f1'); }
    }
    const noneVal = breakdown['__none__'] || 0;
    if (noneVal > 0) { labels.push('Uncategorized'); data.push(noneVal); colors.push('#555570'); }

    Charts.renderCategoryChart(labels, data, colors);
}

function renderHeatmapSection() {
    const { activities, logMap } = state;
    Heatmap.populateMonthSelector(document.getElementById('heatmapMonth'));

    const actSelect = document.getElementById('heatmapActivity');
    actSelect.innerHTML = '';
    if (!activities.length) {
        actSelect.innerHTML = '<option>No activities</option>';
        Heatmap.renderHeatmap([], '');
        return;
    }
    activities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        actSelect.appendChild(opt);
    });

    const drawHeatmap = () => {
        const actId = Number(actSelect.value);
        const act = activities.find(a => a.id === actId);
        const ym = document.getElementById('heatmapMonth').value;
        if (!act || !ym) return;
        const data = Metrics.getHeatmapData(act, logMap, ym);
        Heatmap.renderHeatmap(data, ym);
    };

    actSelect.addEventListener('change', drawHeatmap);
    document.getElementById('heatmapMonth').addEventListener('change', drawHeatmap);
    drawHeatmap();
}

/* ═══════════════════ RENDER ACTIVITIES LIST ═══════════════════ */
function renderActivitiesList(filterCat = '', filterType = '') {
    const list = document.getElementById('activitiesList');
    let acts = state.activities;
    if (filterCat) acts = acts.filter(a => a.category == filterCat);
    if (filterType) acts = acts.filter(a => a.type === filterType);

    list.innerHTML = '';
    if (!acts.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><p>No activities yet. Click <strong>+ New Activity</strong> to get started!</p></div>`;
        return;
    }

    acts.forEach(act => {
        const { current, longest } = Metrics.calcStreak(act, state.logMap);
        const catName = state.categories.find(c => c.id == act.category)?.name || '';
        const div = document.createElement('div');
        div.className = 'activity-card';
        div.innerHTML = `
      <div class="activity-color-dot" style="background:${act.color || '#6366f1'}"></div>
      <div class="activity-info">
        <div class="activity-name">${escHtml(act.name)}</div>
        <div class="activity-meta">
          ${catName ? `<span>📂 ${escHtml(catName)}</span>` : ''}
          <span>🎯 Daily: ${act.dailyTarget}${act.type === 'timed' ? ' min' : ''}</span>
          ${act.weeklyTarget ? `<span>📅 Weekly: ${act.weeklyTarget} days</span>` : ''}
          <span>🔥 Streak: ${current} | Best: ${longest}</span>
        </div>
      </div>
      <div class="activity-badges">
        <span class="type-badge ${act.type}">${act.type === 'binary' ? '✓ Binary' : '⏱ Timed'}</span>
      </div>
      <div class="activity-actions">
        <button class="btn btn-ghost btn-icon" data-edit="${act.id}" title="Edit">✏️</button>
        <button class="btn btn-ghost btn-icon" data-delete="${act.id}" title="Delete">🗑️</button>
      </div>
    `;
        list.appendChild(div);
    });

    // Event delegation
    list.addEventListener('click', (e) => {
        const editId = e.target.closest('[data-edit]')?.dataset.edit;
        const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
        if (editId) openEditActivity(Number(editId));
        if (deleteId) confirmDeleteActivity(Number(deleteId));
    }, { once: true });

    // Populate category filter
    populateCategorySelect('filterCategory', filterCat, true);
    document.getElementById('filterCategory').addEventListener('change', () => {
        renderActivitiesList(document.getElementById('filterCategory').value, document.getElementById('filterType').value);
    });
    document.getElementById('filterType').addEventListener('change', () => {
        renderActivitiesList(document.getElementById('filterCategory').value, document.getElementById('filterType').value);
    });
}

function confirmDeleteActivity(id) {
    state.deletingActivityId = id;
    const act = state.activities.find(a => a.id === id);
    document.getElementById('confirmMessage').textContent =
        `Delete "${act?.name}"? All logs for this activity will be permanently removed.`;
    openModal('confirmModal');

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        await DB.deleteActivity(id);
        closeModal('confirmModal');
        await reloadState();
        renderActivitiesList();
        showToast('Activity deleted.', 'info');
    };
}

/* ═══════════════════ LOG VIEW ═══════════════════ */
function setupLogView() {
    const dateInput = document.getElementById('logDate');
    dateInput.value = Metrics.today();
    dateInput.max = Metrics.today();
    dateInput.addEventListener('change', renderLogView);
}

async function renderLogView() {
    await reloadState();
    const dateInput = document.getElementById('logDate');
    const date = dateInput.value || Metrics.today();
    const isToday = date === Metrics.today();
    const isPast = date < Metrics.today();
    const locked = isPast && state.pastEditLock;

    const badge = document.getElementById('pastLockBadge');
    badge.style.display = locked ? 'inline-block' : 'none';

    const grid = document.getElementById('logGrid');
    grid.innerHTML = '';

    if (!state.activities.length) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Add activities first to begin logging.</p></div>`;
        return;
    }

    for (const act of state.activities) {
        const existingLog = state.logMap[act.id]?.[date];
        const value = existingLog?.value || 0;
        const sessions = existingLog?.sessions || [];
        const notes = existingLog?.notes || '';
        const done = act.type === 'binary' ? value >= 1 : value >= (act.dailyTarget || 1);

        const item = document.createElement('div');
        item.className = 'log-item';

        let controlsHTML = '';
        if (act.type === 'binary') {
            controlsHTML = `
        <div class="log-controls">
          <button class="binary-toggle ${done ? 'done' : ''}" data-act="${act.id}" data-date="${date}" ${locked ? 'disabled' : ''}></button>
          <span style="font-size:0.8rem;color:var(--text-secondary)">${done ? '✅ Done' : '⬜ Not done'}</span>
        </div>
      `;
        } else {
            const totalMin = sessions.reduce((s, v) => s + v, 0);
            const pct = Math.min(100, Math.round((totalMin / (act.dailyTarget || 1)) * 100));
            controlsHTML = `
        <div class="log-controls" style="flex-direction:column;align-items:flex-start;gap:4px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:0.88rem;font-weight:600;color:${done ? 'var(--green)' : 'var(--text-primary)'}">${totalMin} / ${act.dailyTarget || 1} min</span>
            <button class="btn btn-sm btn-outline" data-session="${act.id}" data-date="${date}" ${locked ? 'disabled' : ''}>+ Session</button>
          </div>
          <div style="width:160px;height:6px;background:var(--bg-surface);border-radius:3px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${done ? 'var(--green)' : 'var(--accent)'};transition:width 0.3s;border-radius:3px"></div>
          </div>
        </div>
      `;
        }

        item.innerHTML = `
      <div class="activity-color-dot" style="background:${act.color || '#6366f1'}"></div>
      <div class="log-activity-info">
        <div class="log-activity-name">${escHtml(act.name)}</div>
        <div class="log-activity-target">${act.type === 'binary' ? 'Binary' : `Target: ${act.dailyTarget} min/day`}</div>
      </div>
      ${controlsHTML}
      <input class="input-field log-notes" type="text" placeholder="Notes…" value="${escHtml(notes)}"
             data-notes-act="${act.id}" data-notes-date="${date}" ${locked ? 'disabled' : ''} />
    `;
        grid.appendChild(item);
    }

    // Binary toggles
    grid.querySelectorAll('.binary-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            const actId = Number(btn.dataset.act);
            const d = btn.dataset.date;
            const act = state.activities.find(a => a.id === actId);
            const existingLog = state.logMap[actId]?.[d];
            const newVal = (existingLog?.value >= 1) ? 0 : 1;
            await DB.upsertLog(actId, d, newVal, [], existingLog?.notes || '');
            await reloadState();
            renderLogView();
        });
    });

    // Session buttons
    grid.querySelectorAll('[data-session]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const actId = Number(btn.dataset.session);
            const d = btn.dataset.date;
            openSessionModal(actId, d);
        });
    });

    // Notes blur save
    grid.querySelectorAll('.log-notes').forEach(input => {
        input.addEventListener('blur', async () => {
            if (input.disabled) return;
            const actId = Number(input.dataset.notesAct);
            const d = input.dataset.notesDate;
            const existingLog = state.logMap[actId]?.[d];
            await DB.upsertLog(actId, d, existingLog?.value || 0, existingLog?.sessions || [], input.value);
            await reloadState();
        });
    });
}

/* ═══════════════════ SESSION MODAL ═══════════════════ */
function openSessionModal(activityId, date) {
    state.sessionContext = { activityId, date };
    const act = state.activities.find(a => a.id === activityId);
    document.getElementById('sessionModalTitle').textContent = `Sessions — ${act?.name}`;
    renderSessionList();
    openModal('sessionModal');

    document.getElementById('addSessionBtn').onclick = async () => {
        const mins = Number(document.getElementById('sessionMinutes').value);
        if (!mins || mins < 1) return showToast('Enter valid minutes', 'error');
        const { activityId, date } = state.sessionContext;
        const existingLog = state.logMap[activityId]?.[date];
        const sessions = [...(existingLog?.sessions || []), mins];
        const total = sessions.reduce((s, v) => s + v, 0);
        const capped = Math.min(total, 1440);
        // Recalculate to cap
        let runTotal = 0;
        const cappedSessions = [];
        for (const s of sessions) {
            if (runTotal + s > 1440) { cappedSessions.push(1440 - runTotal); break; }
            cappedSessions.push(s); runTotal += s;
        }
        await DB.upsertLog(activityId, date, Math.min(total, 1440), cappedSessions, existingLog?.notes || '');
        document.getElementById('sessionMinutes').value = '';
        await reloadState();
        renderSessionList();
        renderLogView();
        if (capped < total) showToast('Daily cap of 1440 min reached', 'info');
    };
}

function renderSessionList() {
    const { activityId, date } = state.sessionContext;
    const existingLog = state.logMap[activityId]?.[date];
    const sessions = existingLog?.sessions || [];
    const total = sessions.reduce((s, v) => s + v, 0);
    const listEl = document.getElementById('sessionList');
    document.getElementById('sessionTotal').textContent = total;

    listEl.innerHTML = '';
    if (!sessions.length) {
        listEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem">No sessions yet.</div>';
        return;
    }
    sessions.forEach((mins, idx) => {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML = `
      <span>Session ${idx + 1}</span>
      <span>${mins} min</span>
      <button class="btn btn-ghost btn-icon" data-idx="${idx}">✕</button>
    `;
        listEl.appendChild(item);
    });

    listEl.querySelectorAll('[data-idx]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { activityId, date } = state.sessionContext;
            const existingLog = state.logMap[activityId]?.[date];
            const sessions = [...(existingLog?.sessions || [])];
            sessions.splice(Number(btn.dataset.idx), 1);
            const total = sessions.reduce((s, v) => s + v, 0);
            await DB.upsertLog(activityId, date, total, sessions, existingLog?.notes || '');
            await reloadState();
            renderSessionList();
            renderLogView();
        });
    });
}

/* ═══════════════════ STREAKS VIEW ═══════════════════ */
async function renderStreaks() {
    await reloadState();
    const grid = document.getElementById('streaksGrid');
    grid.innerHTML = '';

    if (!state.activities.length) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔥</div><p>Start logging to build streaks!</p></div>`;
        return;
    }

    state.activities.forEach(act => {
        const { current, longest } = Metrics.calcStreak(act, state.logMap);
        const catName = state.categories.find(c => c.id == act.category)?.name || '';
        const card = document.createElement('div');
        card.className = 'streak-card';
        card.innerHTML = `
      <div class="streak-card-name">
        <span class="streak-flame">🔥</span>${escHtml(act.name)}
        ${catName ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">📂 ${escHtml(catName)}</div>` : ''}
      </div>
      <div class="streak-numbers">
        <div class="streak-stat">
          <div class="streak-stat-val">${current}</div>
          <div class="streak-stat-lbl">Current</div>
        </div>
        <div class="streak-stat">
          <div class="streak-stat-val longest">${longest}</div>
          <div class="streak-stat-lbl">Longest</div>
        </div>
      </div>
    `;
        grid.appendChild(card);
    });
}

/* ═══════════════════ SETTINGS VIEW ═══════════════════ */
async function renderSettings() {
    await reloadState();
    const lockCheckbox = document.getElementById('pastEditLock');
    lockCheckbox.checked = state.pastEditLock;
    lockCheckbox.addEventListener('change', async () => {
        state.pastEditLock = lockCheckbox.checked;
        await DB.setSetting('pastEditLock', lockCheckbox.checked);
        showToast(lockCheckbox.checked ? 'Past edits locked.' : 'Past edits unlocked.', 'info');
    });

    document.getElementById('exportEncryptedBtn').addEventListener('click', async () => {
        const pass = document.getElementById('encryptPassword').value;
        if (!pass) return showToast('Enter a password first', 'error');
        await reloadState();
        try {
            const { exportEncrypted: expEnc } = await import('./export.js');
            await expEnc(state.activities, state.logs, state.categories, pass);
            showToast('Encrypted export downloaded!', 'success');
        } catch {
            showToast('Export failed', 'error');
        }
    });

    renderCategoriesManager();

    document.getElementById('addCategoryBtn').onclick = async () => {
        const name = document.getElementById('newCategoryName').value.trim();
        if (!name) return showToast('Category name required', 'error');
        const color = document.getElementById('newCategoryColor').value;
        await DB.addCategory({ name, color });
        document.getElementById('newCategoryName').value = '';
        await reloadState();
        renderCategoriesManager();
        showToast('Category added!', 'success');
    };

    document.getElementById('clearDataBtn').onclick = () => {
        if (confirm('Delete ALL data? This cannot be undone.')) {
            DB.clearAllData().then(() => { location.reload(); });
        }
    };
}

function renderCategoriesManager() {
    const el = document.getElementById('categoriesManager');
    el.innerHTML = '';
    if (!state.categories.length) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem">No categories yet.</div>';
        return;
    }
    state.categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
      <div class="category-swatch" style="background:${cat.color}"></div>
      <span class="category-item-name">${escHtml(cat.name)}</span>
      <button class="btn btn-ghost btn-icon" data-del-cat="${cat.id}">✕</button>
    `;
        el.appendChild(item);
    });
    el.querySelectorAll('[data-del-cat]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await DB.deleteCategory(Number(btn.dataset.delCat));
            await reloadState();
            renderCategoriesManager();
        });
    });
}

/* ═══════════════════ HELPERS ═══════════════════ */
export function renderAll() {
    if (state.currentView === 'dashboard') renderDashboard();
    else if (state.currentView === 'activities') renderActivitiesList();
    else if (state.currentView === 'log') renderLogView();
    else if (state.currentView === 'streaks') renderStreaks();
    else if (state.currentView === 'settings') renderSettings();
}

function populateCategorySelect(selectId, selectedVal = '', includeAll = false) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '';
    if (includeAll) {
        const opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'All Categories';
        sel.appendChild(opt);
    } else {
        const opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'Uncategorized';
        sel.appendChild(opt);
    }
    state.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        if (cat.id == selectedVal) opt.selected = true;
        sel.appendChild(opt);
    });
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
