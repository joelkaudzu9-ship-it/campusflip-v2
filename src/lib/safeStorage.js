// localStorage can throw (private mode, blocked storage, some in-app browsers).
// These helpers never throw and fall back to an in-memory map.
const memory = new Map();

export const safeStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.has(key) ? memory.get(key) : null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      memory.set(key, String(value));
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};
