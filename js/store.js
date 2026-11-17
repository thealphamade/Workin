// Saving to the phone. Everything lives in localStorage on this device;
// Settings has export/import so a backup can be kept elsewhere.
import { DEFAULT_EQUIPMENT } from './plates.js';
import { WORKOUTS } from './program.js';

const KEY = 'workin:v1';

export function defaultState() {
  return {
    version: 1,
    equipment: structuredClone(DEFAULT_EQUIPMENT),
    settings: { weeklyGoal: 3 },
    sessions: [],
    nextIndex: 0,
    active: null,
  };
}

const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const posNum = (v, fallback) => (num(v, -1) >= 0 ? v : fallback);

function normalizeEquipment(e) {
  const d = DEFAULT_EQUIPMENT;
  if (!e || typeof e !== 'object') return structuredClone(d);
  const plates = Array.isArray(e.plates)
    ? e.plates
        .map((p) => ({ kg: num(p && p.kg, 0), count: Math.floor(num(p && p.count, 0)) }))
        .filter((p) => p.kg > 0 && p.count >= 0)
    : structuredClone(d.plates);
  return {
    handleKg: posNum(e.handleKg, d.handleKg),
    barKg: posNum(e.barKg, d.barKg),
    dbSleeveMax: Math.max(1, Math.floor(num(e.dbSleeveMax, d.dbSleeveMax))),
    barSleeveMax: Math.max(1, Math.floor(num(e.barSleeveMax, d.barSleeveMax))),
    plates,
  };
}

function normalizeSets(sets) {
  return Array.isArray(sets)
    ? sets.map((s) => ({ weight: s && s.weight != null ? num(s.weight, null) : null, reps: Math.max(0, Math.floor(num(s && s.reps, 0))) }))
    : [];
}

function normalizeSession(s) {
  if (!s || typeof s !== 'object' || typeof s.date !== 'string' || Number.isNaN(Date.parse(s.date))) return null;
  const entries = Array.isArray(s.entries)
    ? s.entries
        .filter((e) => e && typeof e.exerciseId === 'string')
        .map((e) => ({ exerciseId: e.exerciseId, sets: normalizeSets(e.sets) }))
        .filter((e) => e.sets.length)
    : [];
  return {
    id: typeof s.id === 'string' ? s.id : String(Date.parse(s.date)),
    date: s.date,
    workoutId: typeof s.workoutId === 'string' && WORKOUTS[s.workoutId] ? s.workoutId : 'A',
    durationSec: Math.max(0, Math.floor(num(s.durationSec, 0))),
    entries,
  };
}

export function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const sessions = Array.isArray(raw.sessions) ? raw.sessions.map(normalizeSession).filter(Boolean) : [];
  sessions.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const goal = Math.floor(num(raw.settings && raw.settings.weeklyGoal, 3));
  const active = raw.active && typeof raw.active === 'object' && WORKOUTS[raw.active.workoutId] && Array.isArray(raw.active.entries)
    ? raw.active
    : null;
  return {
    version: 1,
    equipment: normalizeEquipment(raw.equipment),
    settings: { weeklyGoal: Math.min(7, Math.max(1, goal)) },
    sessions,
    nextIndex: Math.max(0, Math.floor(num(raw.nextIndex, 0))),
    active,
  };
}

let memoryCopy = null; // used if the browser blocks storage (e.g. some private modes)

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    if (memoryCopy) return normalize(JSON.parse(memoryCopy));
  }
  return defaultState();
}

/** Returns false if the data could not be written to the device. */
export function saveState(state) {
  const json = JSON.stringify(state);
  memoryCopy = json;
  try {
    localStorage.setItem(KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch {
    /* not supported */
  }
}
