// Exercises, the training program and progression rules. Pure functions only.
import { nearestLoad, nextLoadUp, formatKg } from './plates.js';

// load: pair = two dumbbells (weight is per dumbbell), single = one dumbbell,
// barbell = the bar, bodyweight = no plates.
// No bench or rack needed for anything here.
export const EXERCISES = {
  gobletSquat: {
    name: 'Goblet Squat', load: 'single', sets: 3, reps: [8, 12], start: 10, rest: 90,
    cues: ['Hold one end of the dumbbell at your chest, elbows tucked', 'Sit down between your heels, chest up', 'Drive through the whole foot to stand'],
  },
  floorPress: {
    name: 'Dumbbell Floor Press', load: 'pair', sets: 3, reps: [8, 12], start: 8, rest: 90,
    cues: ['Lie on the floor, knees bent, feet flat', 'Lower until your upper arms touch the floor, pause', 'Press up and slightly in'],
  },
  bentRow: {
    name: 'Barbell Bent-Over Row', load: 'barbell', sets: 3, reps: [8, 12], start: 20, rest: 90,
    cues: ['Hinge at the hips until your torso is near 45°, back flat', 'Pull the bar to your lower ribs', 'Lower under control, no jerking'],
  },
  overheadPress: {
    name: 'Dumbbell Overhead Press', load: 'pair', sets: 3, reps: [8, 12], start: 6, rest: 90,
    cues: ['Stand tall, squeeze glutes so your lower back stays neutral', 'Press up until your arms are straight beside your ears', 'Lower to shoulder height'],
  },
  curl: {
    name: 'Barbell Curl', load: 'barbell', sets: 2, reps: [10, 15], start: 11, rest: 60,
    cues: ['Elbows pinned to your sides', 'No swinging, if you must swing, it is too heavy', 'Lower slowly, about 2 seconds'],
  },
  plank: {
    name: 'Plank', load: 'bodyweight', unit: 'sec', sets: 3, reps: [30, 60], rest: 45,
    cues: ['Elbows under shoulders', 'Squeeze glutes, ribs down', 'Straight line from head to heels'],
  },
  rdl: {
    name: 'Barbell Romanian Deadlift', load: 'barbell', sets: 3, reps: [8, 12], start: 21, rest: 120,
    cues: ['Soft knees, push your hips back', 'Bar slides down the thighs, back stays flat', 'Stop when you feel the hamstrings stretch, then stand up hard'],
  },
  pushUp: {
    name: 'Push-Up', load: 'bodyweight', sets: 3, reps: [8, 20], rest: 75,
    cues: ['Hands just wider than shoulders', 'Body in one straight line', 'Chest to the floor. Too hard? Hands on a sofa or table'],
  },
  oneArmRow: {
    name: 'One-Arm Dumbbell Row', load: 'single', sets: 3, reps: [10, 15], start: 11, rest: 60, perSide: true,
    cues: ['Free hand braced on a chair or knee', 'Pull the dumbbell to your hip, not your chest', 'Let the shoulder stretch forward at the bottom'],
  },
  reverseLunge: {
    name: 'Dumbbell Reverse Lunge', load: 'pair', sets: 3, reps: [8, 12], start: 6, rest: 90, perSide: true,
    cues: ['Step back, lower the back knee towards the floor', 'Front shin roughly vertical', 'Push through the front heel to return'],
  },
  tricepExt: {
    name: 'Overhead Triceps Extension', load: 'single', sets: 2, reps: [10, 15], start: 8, rest: 60,
    cues: ['Hold one dumbbell with both hands overhead', 'Lower behind your head, elbows pointing up', 'Check the collars are tight first'],
  },
  deadBug: {
    name: 'Dead Bug', load: 'bodyweight', sets: 3, reps: [8, 12], rest: 45, perSide: true,
    cues: ['Lower back pressed into the floor the whole time', 'Extend opposite arm and leg slowly', 'Breathe out as you reach'],
  },
};

for (const [id, ex] of Object.entries(EXERCISES)) ex.id = id;

export const WORKOUTS = {
  A: {
    id: 'A', name: 'Day A', subtitle: 'Squat & Press',
    items: [{ id: 'gobletSquat' }, { id: 'floorPress' }, { id: 'bentRow' }, { id: 'overheadPress' }, { id: 'curl' }, { id: 'plank' }],
  },
  B: {
    id: 'B', name: 'Day B', subtitle: 'Hinge & Pull',
    items: [{ id: 'rdl' }, { id: 'pushUp' }, { id: 'oneArmRow' }, { id: 'reverseLunge' }, { id: 'tricepExt' }, { id: 'deadBug' }],
  },
  quick: {
    id: 'quick', name: 'No-Excuse 15', subtitle: '15 minutes, whole body',
    items: [
      { id: 'gobletSquat', sets: 2, rest: 45 },
      { id: 'pushUp', sets: 2, rest: 45 },
      { id: 'bentRow', sets: 2, rest: 45 },
      { id: 'plank', sets: 2, rest: 30 },
    ],
  },
};

// The main rotation: A, B, A, B...
export const PROGRAM = ['A', 'B'];

export function plannedItems(workoutId) {
  return WORKOUTS[workoutId].items.map((item) => {
    const ex = EXERCISES[item.id];
    return { ex, sets: item.sets ?? ex.sets, rest: item.rest ?? ex.rest };
  });
}

export function lastEntry(sessions, exerciseId) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const e = sessions[i].entries.find((x) => x.exerciseId === exerciseId && x.sets.length);
    if (e) return e;
  }
  return null;
}

export const unitLabel = (ex) => (ex.unit === 'sec' ? 'sec' : 'reps');

/**
 * Double progression: stay at a weight until every set reaches the top of the
 * rep range, then move to the next load the set can actually build.
 * Returns { weight, reps, note, trend: 'new' | 'same' | 'up' | 'max' }.
 */
export function suggest(ex, sessions, eq) {
  const [lo, hi] = ex.reps;
  const last = lastEntry(sessions, ex.id);
  const unit = unitLabel(ex);

  if (ex.load === 'bodyweight') {
    if (!last) return { weight: null, reps: lo, note: `Aim for ${lo}–${hi} ${unit}.`, trend: 'new' };
    const reps = last.sets.map((s) => s.reps || 0);
    const worst = Math.min(...reps);
    const target = worst + 1;
    return { weight: null, reps: target, note: `Last time: ${reps.join(', ')}. Get ${target} on every set.`, trend: 'same' };
  }

  if (!last) {
    const opt = nearestLoad(eq, ex.load, ex.start);
    return {
      weight: opt ? opt.total : ex.start, reps: lo, trend: 'new',
      note: 'First time. Pick a weight you could do 2–3 more reps with.',
    };
  }

  const weight = Math.max(...last.sets.map((s) => s.weight || 0));
  const atWeight = last.sets.filter((s) => (s.weight || 0) === weight).map((s) => s.reps || 0);
  const allTop = atWeight.length >= 2 && atWeight.every((r) => r >= hi);

  if (allTop) {
    const up = nextLoadUp(eq, ex.load, weight);
    if (up) {
      return { weight: up.total, reps: lo, trend: 'up', note: `You hit ${hi} on every set. Go up to ${formatKg(up.total)} kg.` };
    }
    return { weight, reps: hi, trend: 'max', note: 'This is the heaviest your set can build for this lift. Add a set, or take 3 seconds to lower each rep.' };
  }

  const target = Math.min(hi, Math.max(lo, Math.min(...atWeight) + 1));
  return { weight, reps: target, trend: 'same', note: `Last time: ${atWeight.join(', ')} at ${formatKg(weight)} kg. Add a rep where you can.` };
}

/** Best set in a list. Loaded lifts: heaviest weight, then most reps. Bodyweight: most reps. */
export function bestSet(sets) {
  let best = null;
  for (const s of sets) if (!best || isBetter(s, best)) best = s;
  return best;
}

export function isBetter(a, b) {
  const aw = a.weight || 0;
  const bw = b.weight || 0;
  if (aw !== bw) return aw > bw;
  return (a.reps || 0) > (b.reps || 0);
}

export function personalBests(sessions) {
  const map = new Map();
  for (const s of sessions) {
    for (const e of s.entries) {
      const b = bestSet(e.sets);
      if (!b) continue;
      const cur = map.get(e.exerciseId);
      if (!cur || isBetter(b, cur.set)) map.set(e.exerciseId, { set: b, date: s.date });
    }
  }
  return map;
}

/** Which exercises in `entries` beat everything in `previous` sessions. First-ever attempts don't count. */
export function findPRs(entries, previous) {
  const prior = personalBests(previous);
  const prs = [];
  for (const e of entries) {
    const b = bestSet(e.sets);
    const p = prior.get(e.exerciseId);
    if (b && p && isBetter(b, p.set)) prs.push({ exerciseId: e.exerciseId, set: b, previous: p.set });
  }
  return prs;
}

/** Total kg moved. A pair of dumbbells counts both. */
export function sessionVolume(session) {
  let v = 0;
  for (const e of session.entries) {
    const ex = EXERCISES[e.exerciseId];
    if (!ex || ex.load === 'bodyweight') continue;
    const mult = ex.load === 'pair' ? 2 : 1;
    for (const s of e.sets) v += (s.weight || 0) * (s.reps || 0) * mult;
  }
  return Math.round(v);
}

export function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

/** This week's count and the streak of weeks that met the goal. The current week only breaks the streak once it is over. */
export function weekStats(sessions, goal, now = new Date()) {
  const counts = new Map();
  for (const s of sessions) {
    const k = weekStart(s.date).getTime();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const cur = weekStart(now);
  const thisWeek = counts.get(cur.getTime()) || 0;
  let streak = thisWeek >= goal ? 1 : 0;
  const w = new Date(cur);
  for (;;) {
    w.setDate(w.getDate() - 7);
    if ((counts.get(w.getTime()) || 0) >= goal) streak++;
    else break;
  }
  return { thisWeek, goal, streak };
}

export function daysSince(dateIso, now = new Date()) {
  const a = new Date(dateIso);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
