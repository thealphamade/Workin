import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EQUIPMENT as eq, nearestLoad } from '../js/plates.js';
import {
  EXERCISES, WORKOUTS, suggest, findPRs, sessionVolume, weekStats, weekStart,
} from '../js/program.js';
import { normalize } from '../js/store.js';

const session = (date, exerciseId, sets) => ({ id: date, date, workoutId: 'A', durationSec: 1800, entries: [{ exerciseId, sets }] });

test('every workout references real exercises', () => {
  for (const w of Object.values(WORKOUTS)) for (const item of w.items) assert.ok(EXERCISES[item.id], item.id);
});

test('every loaded exercise starts at a weight the default set can build', () => {
  for (const ex of Object.values(EXERCISES)) {
    if (ex.load === 'bodyweight') continue;
    const s = suggest(ex, [], eq);
    assert.equal(s.weight, nearestLoad(eq, ex.load, ex.start).total, ex.id);
    assert.equal(s.trend, 'new');
  }
});

test('stays at the weight until every set hits the top of the range', () => {
  const ex = EXERCISES.floorPress; // 8-12
  const s = suggest(ex, [session('2026-11-02T10:00:00Z', 'floorPress', [{ weight: 9.5, reps: 12 }, { weight: 9.5, reps: 11 }, { weight: 9.5, reps: 9 }])], eq);
  assert.equal(s.trend, 'same');
  assert.equal(s.weight, 9.5);
  assert.equal(s.reps, 10);
});

test('moves up to the next buildable weight', () => {
  const ex = EXERCISES.floorPress;
  const s = suggest(ex, [session('2026-11-02T10:00:00Z', 'floorPress', [{ weight: 9.5, reps: 12 }, { weight: 9.5, reps: 12 }, { weight: 9.5, reps: 13 }])], eq);
  assert.equal(s.trend, 'up');
  assert.equal(s.weight, 12);
  assert.equal(s.reps, 8);
});

test('tells you when the set is maxed out', () => {
  const ex = EXERCISES.floorPress;
  const s = suggest(ex, [session('2026-11-02T10:00:00Z', 'floorPress', [{ weight: 19.5, reps: 12 }, { weight: 19.5, reps: 12 }])], eq);
  assert.equal(s.trend, 'max');
});

test('bodyweight: beat your weakest set', () => {
  const s = suggest(EXERCISES.pushUp, [session('2026-11-02T10:00:00Z', 'pushUp', [{ weight: null, reps: 15 }, { weight: null, reps: 12 }])], eq);
  assert.equal(s.reps, 13);
});

test('PRs only count against earlier history', () => {
  const prev = [session('2026-11-02T10:00:00Z', 'rdl', [{ weight: 21, reps: 10 }])];
  assert.equal(findPRs([{ exerciseId: 'rdl', sets: [{ weight: 21, reps: 11 }] }], prev).length, 1);
  assert.equal(findPRs([{ exerciseId: 'rdl', sets: [{ weight: 21, reps: 9 }] }], prev).length, 0);
  assert.equal(findPRs([{ exerciseId: 'curl', sets: [{ weight: 11, reps: 10 }] }], prev).length, 0);
});

test('volume counts both dumbbells and skips bodyweight', () => {
  const s = { entries: [
    { exerciseId: 'floorPress', sets: [{ weight: 10, reps: 10 }] },
    { exerciseId: 'rdl', sets: [{ weight: 20, reps: 10 }] },
    { exerciseId: 'pushUp', sets: [{ weight: null, reps: 20 }] },
  ] };
  assert.equal(sessionVolume(s), 400);
});

test('weeks start on Monday and the streak counts goal-hitting weeks', () => {
  assert.equal(weekStart(new Date(2026, 10, 22, 18)).getDate(), 16); // Sun 22 Nov -> Mon 16
  const d = (y, m, day) => new Date(y, m, day, 12).toISOString();
  const sessions = [
    d(2026, 10, 2), d(2026, 10, 4), d(2026, 10, 6),   // week of 2 Nov: 3
    d(2026, 10, 9), d(2026, 10, 11), d(2026, 10, 13), // week of 9 Nov: 3
    d(2026, 10, 16),                                  // this week: 1
  ].map((date) => ({ date, entries: [] }));
  const ws = weekStats(sessions, 3, new Date(2026, 10, 17, 9));
  assert.equal(ws.thisWeek, 1);
  assert.equal(ws.streak, 2); // this week isn't over, so it doesn't break the streak
});

test('normalize repairs junk and keeps good data', () => {
  const s = normalize({ sessions: [{ date: 'nope' }, { date: '2026-11-02T10:00:00Z', entries: [{ exerciseId: 'rdl', sets: [{ weight: 21, reps: 8 }] }] }], settings: { weeklyGoal: 99 } });
  assert.equal(s.sessions.length, 1);
  assert.equal(s.settings.weeklyGoal, 7);
  assert.equal(s.equipment.plates.length, 3);
  assert.equal(normalize(null).sessions.length, 0);
});
