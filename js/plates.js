// Plate maths for an adjustable chrome dumbbell / barbell set.
// Pure functions only, so they can be unit-tested in Node.

// A typical 55 kg chrome set: 2 dumbbell handles, 1 barbell bar, spin-lock collars and plates.
// Sets vary, so all of this is editable in Settings.
export const DEFAULT_EQUIPMENT = {
  handleKg: 2,        // one dumbbell handle incl. its two collars
  barKg: 6,           // barbell bar incl. its two collars
  dbSleeveMax: 4,     // most plates that physically fit on one side of a dumbbell handle
  barSleeveMax: 8,    // most plates that fit on one side of the bar
  plates: [
    { kg: 5, count: 6 },
    { kg: 2.5, count: 4 },
    { kg: 1.25, count: 4 },
  ],
};

export const LOAD_MODES = ['pair', 'single', 'barbell'];

export const MODE_LABEL = {
  pair: 'Dumbbell pair',
  single: 'One dumbbell',
  barbell: 'Barbell',
  bodyweight: 'Bodyweight',
};

const round = (n) => Math.round(n * 1000) / 1000;

export function equipmentTotal(eq) {
  const plates = eq.plates.reduce((s, p) => s + p.kg * p.count, 0);
  return round(plates + eq.handleKg * 2 + eq.barKg);
}

export function baseWeight(eq, mode) {
  return mode === 'barbell' ? eq.barKg : eq.handleKg;
}

// How many of each plate one side can use. Loading a pair of dumbbells needs
// 4 identical plates (2 per dumbbell, 1 per side); one dumbbell or the bar needs 2.
function sideInventory(eq, mode) {
  const divisor = mode === 'pair' ? 4 : 2;
  const merged = new Map();
  for (const p of eq.plates) {
    const kg = Number(p.kg);
    const count = Math.floor(Number(p.count));
    if (!(kg > 0) || !(count > 0)) continue;
    merged.set(kg, (merged.get(kg) || 0) + count);
  }
  return [...merged.entries()]
    .map(([kg, count]) => ({ kg, max: Math.floor(count / divisor) }))
    .filter((p) => p.max > 0)
    .sort((a, b) => b.kg - a.kg);
}

const plateCount = (perSide) => perSide.reduce((s, p) => s + p.n, 0);

/**
 * Every load you can build in this mode, lightest first.
 * Each option: { total, perSide: [{kg, n}], plates } where total is the weight
 * of ONE implement (one dumbbell, or the whole barbell) and perSide uses the
 * fewest plates possible for that total.
 */
export function loadOptions(eq, mode) {
  if (!LOAD_MODES.includes(mode)) return [];
  const sleeveMax = mode === 'barbell' ? eq.barSleeveMax : eq.dbSleeveMax;
  // side sum -> fewest-plate combination reaching it
  let states = new Map([[0, []]]);
  for (const p of sideInventory(eq, mode)) {
    const next = new Map();
    for (const [sum, combo] of states) {
      for (let n = 0; n <= p.max; n++) {
        const s = round(sum + n * p.kg);
        const c = n ? [...combo, { kg: p.kg, n }] : combo;
        const cur = next.get(s);
        if (!cur || plateCount(c) < plateCount(cur)) next.set(s, c);
      }
    }
    states = next;
  }
  const base = baseWeight(eq, mode);
  return [...states.entries()]
    .filter(([, combo]) => plateCount(combo) <= sleeveMax)
    .map(([side, combo]) => ({ total: round(base + 2 * side), perSide: combo, plates: plateCount(combo) * 2 }))
    .sort((a, b) => a.total - b.total);
}

/** The buildable load closest to target (ties go to the lighter one). */
export function nearestLoad(eq, mode, target) {
  const opts = loadOptions(eq, mode);
  if (!opts.length) return null;
  let best = opts[0];
  for (const o of opts) {
    if (Math.abs(o.total - target) < Math.abs(best.total - target) - 1e-9) best = o;
  }
  return best;
}

/** The next buildable load strictly heavier than current, or null at the max. */
export function nextLoadUp(eq, mode, current) {
  return loadOptions(eq, mode).find((o) => o.total > current + 1e-9) || null;
}

export function maxLoad(eq, mode) {
  const opts = loadOptions(eq, mode);
  return opts.length ? opts[opts.length - 1] : null;
}

export function formatKg(kg) {
  if (kg == null || Number.isNaN(kg)) return '–';
  return String(round(kg));
}

/** "5 + 2.5 each side" style text for one option. */
export function describeLoad(option, mode) {
  if (!option) return '';
  const implement = mode === 'barbell' ? 'bar' : 'handle';
  if (!option.perSide.length) return `Empty ${implement}`;
  const parts = [];
  for (const p of option.perSide) for (let i = 0; i < p.n; i++) parts.push(formatKg(p.kg));
  return `${parts.join(' + ')} each side`;
}
