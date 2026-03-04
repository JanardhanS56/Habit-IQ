const DB_NAME = "HabitIntelligenceDB";
const DB_VERSION = 1;

let db;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains("activities")) {
        db.createObjectStore("activities", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("entries")) {
        db.createObjectStore("entries", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

export function add(store, data) {
  return tx(store, "readwrite").add(data);
}

export function getAll(store) {
  return tx(store, "readonly").getAll();
}

export function put(store, data) {
  return tx(store, "readwrite").put(data);
}

export function remove(store, id) {
  return tx(store, "readwrite").delete(id);
}

function tx(store, mode) {
  return db.transaction(store, mode).objectStore(store);
}
