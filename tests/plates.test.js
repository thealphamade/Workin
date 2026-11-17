import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EQUIPMENT, loadOptions, nearestLoad, nextLoadUp, maxLoad, describeLoad, equipmentTotal,
} from '../js/plates.js';

const eq = DEFAULT_EQUIPMENT;
const totals = (mode, e = eq) => loadOptions(e, mode).map((o) => o.total);

test('default set adds up to 55 kg', () => {
  assert.equal(equipmentTotal(eq), 55);
});

test('a pair of dumbbells uses each plate size in fours', () => {
  // 6x5 -> 1 per side, 4x2.5 -> 1, 4x1.25 -> 1
  assert.deepEqual(totals('pair'), [2, 4.5, 7, 9.5, 12, 14.5, 17, 19.5]);
});

test('one dumbbell can use plates from both sets, limited by sleeve space', () => {
  const t = totals('single');
  assert.equal(t[0], 2);
  // 4 plates per side max: 5+5+5+2.5 = 17.5 -> 2 + 35 = 37
  assert.equal(t[t.length - 1], 37);
});

test('barbell can take everything', () => {
  assert.equal(maxLoad(eq, 'barbell').total, 51);
  assert.deepEqual(totals('barbell').slice(0, 4), [6, 8.5, 11, 13.5]);
});

test('uses the fewest plates for a given weight', () => {
  const opt = loadOptions(eq, 'barbell').find((o) => o.total === 16);
  assert.deepEqual(opt.perSide, [{ kg: 5, n: 1 }]);
});

test('nearest load rounds to what you can build, ties go lighter', () => {
  assert.equal(nearestLoad(eq, 'pair', 8).total, 7);
  assert.equal(nearestLoad(eq, 'pair', 8.25).total, 7); // exactly between 7 and 9.5
  assert.equal(nearestLoad(eq, 'pair', 100).total, 19.5);
});

test('next load up and the ceiling', () => {
  assert.equal(nextLoadUp(eq, 'pair', 9.5).total, 12);
  assert.equal(nextLoadUp(eq, 'pair', 19.5), null);
});

test('duplicate plate rows merge, empty inventory gives only the handle', () => {
  const e = { ...eq, plates: [{ kg: 5, count: 2 }, { kg: 5, count: 2 }] };
  assert.deepEqual(totals('pair', e), [2, 12]);
  assert.deepEqual(totals('pair', { ...eq, plates: [] }), [2]);
});

test('describes loading', () => {
  const opt = nearestLoad(eq, 'pair', 17);
  assert.equal(describeLoad(opt, 'pair'), '5 + 2.5 each side');
  assert.equal(describeLoad(nearestLoad(eq, 'barbell', 6), 'barbell'), 'Empty bar');
});

test('large inventories stay fast', () => {
  const big = { ...eq, barSleeveMax: 20, plates: [0.5, 1, 1.25, 2, 2.5, 5, 10, 15, 20, 25].map((kg) => ({ kg, count: 20 })) };
  const t0 = Date.now();
  loadOptions(big, 'barbell');
  assert.ok(Date.now() - t0 < 1000);
});
