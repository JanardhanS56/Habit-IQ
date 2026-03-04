/**
 * metrics.js — Habit Intelligence metrics calculations
 * Consistency Score, Target Adherence, Streak Dominance, Weighted Productivity
 */

/**
 * Returns date strings for the past N days (including today)
 */
export function getDateRange(days) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(toDateStr(d));
    }
    return dates;
}

export function toDateStr(d) {
    return d.toISOString().split('T')[0];
}

export function today() {
    return toDateStr(new Date());
}

/**
 * Build a map: { [activityId]: { [dateStr]: logRecord } }
 */
export function buildLogMap(logs) {
    const map = {};
    for (const log of logs) {
        if (!map[log.activityId]) map[log.activityId] = {};
        map[log.activityId][log.date] = log;
    }
    return map;
}

/**
 * Check if an activity was "completed" on a given day.
 * Binary: value === 1
 * Timed: value >= dailyTarget (in minutes, capped at 1440)
 */
export function isCompleted(log, activity) {
    if (!log) return false;
    if (activity.type === 'binary') return log.value >= 1;
    return log.value >= (activity.dailyTarget || 1);
}

/**
 * Consistency Score (0–100):
 * Percentage of past 30 days where at least one activity was completed.
 */
export function calcConsistencyScore(activities, logMap) {
    if (!activities.length) return 0;
    const dates = getDateRange(30);
    let totalPossible = activities.length * dates.length;
    let completed = 0;
    for (const act of activities) {
        for (const date of dates) {
            const log = logMap[act.id]?.[date];
            if (isCompleted(log, act)) completed++;
        }
    }
    if (!totalPossible) return 0;
    return Math.round((completed / totalPossible) * 100);
}

/**
 * Target Adherence % (0–100):
 * % of activity-days where daily target was met, over past 30 days.
 */
export function calcTargetAdherence(activities, logMap) {
    if (!activities.length) return 0;
    const dates = getDateRange(30);
    let met = 0, total = activities.length * dates.length;
    for (const act of activities) {
        for (const date of dates) {
            const log = logMap[act.id]?.[date];
            if (isCompleted(log, act)) met++;
        }
    }
    return total ? Math.round((met / total) * 100) : 0;
}

/**
 * Streak for a single activity: returns { current, longest }
 */
export function calcStreak(activity, logMap) {
    const allDates = getDateRange(365);
    let current = 0, longest = 0, running = 0;
    // Traverse backwards to find current streak
    for (let i = allDates.length - 1; i >= 0; i--) {
        const log = logMap[activity.id]?.[allDates[i]];
        if (isCompleted(log, activity)) {
            current++;
        } else {
            // Allow today to be incomplete (don't break if it's today)
            if (allDates[i] === today() && current === 0) continue;
            break;
        }
    }
    // Traverse all to find longest
    for (const date of allDates) {
        const log = logMap[activity.id]?.[date];
        if (isCompleted(log, activity)) {
            running++;
            if (running > longest) longest = running;
        } else {
            running = 0;
        }
    }
    return { current, longest };
}

/**
 * Streak Dominance (0–100):
 * Ratio of activities that have an active streak (current >= 1) vs total
 */
export function calcStreakDominance(activities, logMap) {
    if (!activities.length) return 0;
    let active = 0;
    for (const act of activities) {
        const { current } = calcStreak(act, logMap);
        if (current >= 1) active++;
    }
    return Math.round((active / activities.length) * 100);
}

/**
 * Weighted Productivity Score (0–100):
 * Weighted combination of consistency (40%), adherence (40%), streak dominance (20%)
 */
export function calcProductivityScore(consistency, adherence, streakDom) {
    return Math.round(consistency * 0.4 + adherence * 0.4 + streakDom * 0.2);
}

/**
 * Compute all metrics at once
 */
export function calcAllMetrics(activities, logMap) {
    const consistency = calcConsistencyScore(activities, logMap);
    const adherence = calcTargetAdherence(activities, logMap);
    const streakDom = calcStreakDominance(activities, logMap);
    const productivity = calcProductivityScore(consistency, adherence, streakDom);
    return { consistency, adherence, streakDom, productivity };
}

/**
 * Daily values for an activity over the past N days (for bar chart)
 */
export function getDailyValues(activity, logMap, days = 7) {
    const dates = getDateRange(days);
    return dates.map(date => {
        const log = logMap[activity.id]?.[date];
        return log ? (log.value || 0) : 0;
    });
}

/**
 * Weekly aggregation: past N weeks, sum of completed days per week
 */
export function getWeeklyData(activities, logMap, weeks = 8) {
    const result = [];
    for (let w = weeks - 1; w >= 0; w--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - w * 7 - 6);
        let totalCompleted = 0;
        for (let d = 0; d < 7; d++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + d);
            const dateStr = toDateStr(day);
            for (const act of activities) {
                const log = logMap[act.id]?.[dateStr];
                if (isCompleted(log, act)) totalCompleted++;
            }
        }
        const label = `W${weeks - w}`;
        result.push({ label, value: totalCompleted });
    }
    return result;
}

/**
 * Category breakdown: total completions per category over past 30 days
 */
export function getCategoryBreakdown(activities, logMap, categories) {
    const catMap = {};
    for (const cat of categories) catMap[cat.id] = 0;
    catMap['__none__'] = 0;

    const dates = getDateRange(30);
    for (const act of activities) {
        let key = act.category || '__none__';
        if (!(key in catMap)) catMap[key] = 0;
        for (const date of dates) {
            const log = logMap[act.id]?.[date];
            if (isCompleted(log, act)) catMap[key]++;
        }
    }
    return catMap;
}

/**
 * Heatmap data for a specific activity and month (YYYY-MM)
 */
export function getHeatmapData(activity, logMap, yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const log = logMap[activity.id]?.[dateStr];
        const value = log ? (log.value || 0) : 0;
        const target = activity.dailyTarget || 1;
        // Level 0-4 based on value vs target
        let level = 0;
        if (value > 0) {
            const ratio = activity.type === 'binary' ? (value >= 1 ? 1 : 0) : value / target;
            if (ratio >= 1) level = 4;
            else if (ratio >= 0.75) level = 3;
            else if (ratio >= 0.5) level = 2;
            else level = 1;
        }
        result.push({ date: dateStr, value, level });
    }
    return result;
}
