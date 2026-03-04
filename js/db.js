/**
 * db.js — IndexedDB wrapper for Habit Intelligence Dashboard
 * Stores: activities, logs, categories, settings
 */

const DB_NAME = 'HabitIQ';
const DB_VERSION = 1;

let _db = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Activities store
      if (!db.objectStoreNames.contains('activities')) {
        const acts = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
        acts.createIndex('category', 'category', { unique: false });
      }
      // Logs store: { id, activityId, date (YYYY-MM-DD), value, sessions, notes }
      if (!db.objectStoreNames.contains('logs')) {
        const logs = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('activityId', 'activityId', { unique: false });
        logs.createIndex('date', 'date', { unique: false });
        logs.createIndex('activityDate', ['activityId', 'date'], { unique: false });
      }
      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
      }
      // Settings store (key-value)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

/* ── Generic helpers ── */
function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function getAll(store) {
  return new Promise((resolve, reject) => {
    const req = tx(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getByIndex(store, indexName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(store).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function addRecord(store, data) {
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putRecord(store, data) {
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteRecord(store, id) {
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getRecord(store, id) {
  return new Promise((resolve, reject) => {
    const req = tx(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── Activities ── */
export const getAllActivities = () => getAll('activities');
export const addActivity = (data) => addRecord('activities', data);
export const updateActivity = (data) => putRecord('activities', data);
export const deleteActivity = async (id) => {
  await deleteRecord('activities', id);
  // cascade delete logs
  const logs = await getByIndex('logs', 'activityId', id);
  const s = _db.transaction('logs', 'readwrite').objectStore('logs');
  for (const log of logs) s.delete(log.id);
};

/* ── Logs ── */
export const getAllLogs = () => getAll('logs');
export const getLogsByActivity = (activityId) => getByIndex('logs', 'activityId', activityId);
export const getLogsByDate = (date) => getByIndex('logs', 'date', date);

export async function getLog(activityId, date) {
  const logs = await getAll('logs');
  return logs.find(l => l.activityId === activityId && l.date === date) || null;
}

export async function upsertLog(activityId, date, value, sessions = [], notes = '') {
  const existing = await getLog(activityId, date);
  const data = { activityId, date, value, sessions, notes };
  if (existing) { data.id = existing.id; return putRecord('logs', data); }
  return addRecord('logs', data);
}

export const deleteLog = (id) => deleteRecord('logs', id);

/* ── Categories ── */
export const getAllCategories = () => getAll('categories');
export const addCategory = (data) => addRecord('categories', data);
export const deleteCategory = (id) => deleteRecord('categories', id);

/* ── Settings ── */
export async function getSetting(key, defaultVal = null) {
  const rec = await getRecord('settings', key);
  return rec ? rec.value : defaultVal;
}
export async function setSetting(key, value) {
  return putRecord('settings', { key, value });
}

/* ── Bulk export ── */
export async function exportAllData() {
  const [activities, logs, categories] = await Promise.all([
    getAllActivities(), getAllLogs(), getAllCategories()
  ]);
  return { activities, logs, categories };
}

/* ── Clear all ── */
export async function clearAllData() {
  const stores = ['activities', 'logs', 'categories', 'settings'];
  for (const s of stores) {
    await new Promise((res, rej) => {
      const req = tx(s, 'readwrite').clear();
      req.onsuccess = res; req.onerror = rej;
    });
  }
}
