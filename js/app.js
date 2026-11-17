import {
  loadOptions, nearestLoad, maxLoad, describeLoad, formatKg, equipmentTotal, MODE_LABEL,
} from './plates.js';
import {
  EXERCISES, WORKOUTS, PROGRAM, plannedItems, suggest, unitLabel, personalBests, findPRs,
  sessionVolume, weekStats, daysSince,
} from './program.js';
import { loadState, saveState, normalize, defaultState, requestPersistentStorage } from './store.js';

let state = loadState();
const ui = { route: null, platesMode: 'pair', platesPick: null, summary: null };
const view = document.getElementById('view');
const restEl = document.getElementById('rest');
const toastEl = document.getElementById('toast');

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const kg = (n) => `${formatKg(n)} kg`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const clock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
const minutes = (sec) => `${Math.max(1, Math.round(sec / 60))} min`;
const parseNum = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function save() {
  if (!saveState(state)) toast("Couldn't save to this device. Export a backup from Settings.");
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

function loadText(ex, weight) {
  if (ex.load === 'bodyweight') return '';
  const opt = nearestLoad(state.equipment, ex.load, weight ?? 0);
  if (!opt) return 'Add plates in Settings to see how to load this.';
  const what = ex.load === 'pair' ? 'Each dumbbell' : ex.load === 'single' ? 'Dumbbell' : 'Bar';
  if (weight != null && Math.abs(opt.total - weight) > 1e-9) {
    return `Your set can't make ${kg(weight)}. Closest: <b>${kg(opt.total)}</b> = ${esc(describeLoad(opt, ex.load))}`;
  }
  return `${what}: ${esc(describeLoad(opt, ex.load))}`;
}

function loadTag(ex) {
  if (ex.load === 'pair') return '2 dumbbells · kg each';
  if (ex.load === 'single') return '1 dumbbell';
  if (ex.load === 'barbell') return 'Barbell';
  return 'Bodyweight';
}

function targetText(ex, sets, sug) {
  const range = `${sets} × ${ex.reps[0]}–${ex.reps[1]} ${unitLabel(ex)}${ex.perSide ? ' each side' : ''}`;
  return sug.weight != null ? `${range} · ${kg(sug.weight)}` : range;
}

// ---------- icons ----------
const icon = {
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h2M20 12h2M6 8v8M18 8v8M4 10v4M20 10v4M6 12h12"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
  plates: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

// ---------- views ----------
function nudge(sessions) {
  if (!sessions.length) return "Day one. The set's out of the box, so let's use it.";
  const d = daysSince(sessions[sessions.length - 1].date);
  if (d <= 0) return 'Trained today. Eat, sleep, come back stronger.';
  if (d === 1) return 'Trained yesterday. You are good to go today.';
  if (d === 2) return '2 days off. Today is a good day.';
  return `${d} days off. The weights haven't moved. Even 15 minutes counts.`;
}

function viewToday() {
  const ws = weekStats(state.sessions, state.settings.weeklyGoal);
  const dots = Array.from({ length: Math.max(ws.goal, ws.thisWeek) }, (_, i) => `<span class="dot${i < ws.thisWeek ? ' on' : ''}${i >= ws.goal ? ' bonus' : ''}"></span>`).join('');
  const streak = ws.streak ? ` · <span class="streak">${ws.streak} week streak</span>` : '';
  let html = `
    <section class="hero">
      <p class="eyebrow">This week</p>
      <div class="dots" role="img" aria-label="${ws.thisWeek} of ${ws.goal} workouts">${dots}</div>
      <p class="week-line"><strong>${ws.thisWeek} of ${ws.goal}</strong> workouts${streak}</p>
      <p class="nudge">${esc(nudge(state.sessions))}</p>
    </section>`;

  if (state.active) {
    const w = WORKOUTS[state.active.workoutId];
    const done = state.active.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    html += `
      <section class="card accent">
        <p class="eyebrow">In progress</p>
        <h2>${esc(w.name)} <span class="sub">${esc(w.subtitle)}</span></h2>
        <p class="muted">Started ${minutes((Date.now() - state.active.startedAt) / 1000)} ago · ${done} sets done</p>
        <div class="row"><a class="btn primary" href="#workout">Resume workout</a><button class="btn ghost" data-act="discard">Discard</button></div>
      </section>`;
    return html;
  }

  const nextId = PROGRAM[state.nextIndex % PROGRAM.length];
  const otherId = PROGRAM[(state.nextIndex + 1) % PROGRAM.length];
  const w = WORKOUTS[nextId];
  const plan = plannedItems(nextId).map(({ ex, sets }) => {
    const sug = suggest(ex, state.sessions, state.equipment);
    const badge = sug.trend === 'up' ? '<span class="badge up">↑ heavier</span>' : sug.trend === 'new' ? '<span class="badge">new</span>' : '';
    return `<li><span class="ex-name">${esc(ex.name)}</span>${badge}<span class="ex-target">${esc(targetText(ex, sets, sug))}</span></li>`;
  }).join('');

  html += `
    <section class="card">
      <p class="eyebrow">Next up</p>
      <h2>${esc(w.name)} <span class="sub">${esc(w.subtitle)}</span></h2>
      <ol class="plan">${plan}</ol>
      <button class="btn primary block" data-act="start" data-w="${nextId}">Start ${esc(w.name)}</button>
      <button class="btn ghost block" data-act="start" data-w="${otherId}">Do ${esc(WORKOUTS[otherId].name)} instead</button>
    </section>
    <section class="card quick">
      <h3>No time? No excuse.</h3>
      <p class="muted">15 minutes. Squats, push-ups, rows, plank. 2 sets each.</p>
      <button class="btn block" data-act="start" data-w="quick">Start No-Excuse 15</button>
    </section>`;
  return html;
}

function viewWorkout() {
  const a = state.active;
  const w = WORKOUTS[a.workoutId];
  const cards = a.entries.map((e, i) => {
    const ex = EXERCISES[e.exerciseId];
    const bw = ex.load === 'bodyweight';
    const unit = unitLabel(ex);
    const rows = e.sets.map((s, j) => `
      <div class="set${s.done ? ' done' : ''}${bw ? ' bw' : ''}">
        <span class="set-n">${j + 1}</span>
        ${bw ? '' : `<input class="num" type="text" inputmode="decimal" aria-label="Set ${j + 1} weight in kg" data-f="weight" data-e="${i}" data-s="${j}" value="${s.weight ?? ''}">`}
        <input class="num" type="text" inputmode="numeric" aria-label="Set ${j + 1} ${unit}" data-f="reps" data-e="${i}" data-s="${j}" value="${s.reps ?? ''}" placeholder="${s.target}">
        <button class="check" data-act="toggle" data-e="${i}" data-s="${j}" aria-pressed="${s.done}" aria-label="Set ${j + 1} done">${icon.check}</button>
      </div>`).join('');
    const firstOpen = e.sets.find((s) => !s.done) || e.sets[e.sets.length - 1];
    const cues = ex.cues.map((c) => `<li>${esc(c)}</li>`).join('');
    return `
      <section class="card ex" data-ex="${i}">
        <header class="ex-head">
          <h3>${esc(ex.name)}</h3>
          <span class="tag">${loadTag(ex)}</span>
        </header>
        <p class="hint trend-${e.trend}">${esc(e.note)}</p>
        ${bw ? '' : `<p class="load" data-load="${i}">${loadText(ex, firstOpen ? firstOpen.weight : null)}</p>`}
        <div class="sets">
          <div class="set head${bw ? ' bw' : ''}"><span>Set</span>${bw ? '' : `<span>${ex.load === 'pair' ? 'kg each' : 'kg'}</span>`}<span>${unit}${ex.perSide ? ' / side' : ''}</span><span></span></div>
          ${rows}
        </div>
        <div class="ex-foot">
          <button class="btn small ghost" data-act="add-set" data-e="${i}">+ Set</button>
          ${e.sets.length > 1 ? `<button class="btn small ghost" data-act="remove-set" data-e="${i}">− Set</button>` : ''}
          <details class="cues"><summary>Form</summary><ul>${cues}</ul></details>
        </div>
      </section>`;
  }).join('');

  return `
    <header class="wo-head">
      <div>
        <p class="eyebrow">${esc(w.name)} · ${esc(w.subtitle)}</p>
        <p class="elapsed" id="elapsed">${clock((Date.now() - a.startedAt) / 1000)}</p>
      </div>
      <button class="btn primary" data-act="finish">Finish</button>
    </header>
    ${cards}
    <div class="wo-foot">
      <button class="btn primary block" data-act="finish">Finish workout</button>
      <button class="btn ghost block" data-act="discard">Discard workout</button>
    </div>`;
}

function viewDone() {
  const sum = ui.summary;
  if (!sum) return viewToday();
  const { session, prs } = sum;
  const ws = weekStats(state.sessions, state.settings.weeklyGoal);
  const sets = session.entries.reduce((n, e) => n + e.sets.length, 0);
  const prList = prs.length
    ? `<section class="card accent"><p class="eyebrow">New personal bests</p><ul class="list">${prs.map((p) => {
        const ex = EXERCISES[p.exerciseId];
        return `<li><span>${esc(ex.name)}</span><b>${esc(setText(ex, p.set))}</b></li>`;
      }).join('')}</ul></section>`
    : '';
  const goalLine = ws.thisWeek >= ws.goal
    ? `Weekly goal hit: ${ws.thisWeek} of ${ws.goal}.`
    : `${ws.thisWeek} of ${ws.goal} this week. ${ws.goal - ws.thisWeek} to go.`;
  return `
    <section class="hero done">
      <p class="eyebrow">Workout done</p>
      <h2 class="big">No excuses. ✔</h2>
      <p class="nudge">${esc(goalLine)}</p>
    </section>
    <section class="stats">
      <div><b>${minutes(session.durationSec)}</b><span>time</span></div>
      <div><b>${sets}</b><span>sets</span></div>
      <div><b>${sessionVolume(session).toLocaleString()}</b><span>kg lifted</span></div>
    </section>
    ${prList}
    <a class="btn primary block" href="#today">Back to Today</a>`;
}

function setText(ex, s) {
  if (ex.load === 'bodyweight') return `${s.reps} ${unitLabel(ex)}`;
  return `${formatKg(s.weight)} kg × ${s.reps}`;
}

function viewHistory() {
  if (!state.sessions.length) {
    return `<section class="empty"><h2>Nothing logged yet</h2><p class="muted">Your workouts and personal bests show up here once you finish one.</p><a class="btn primary" href="#today">Go to Today</a></section>`;
  }
  const pbs = personalBests(state.sessions);
  const pbRows = Object.values(EXERCISES)
    .filter((ex) => pbs.has(ex.id))
    .map((ex) => `<li><span>${esc(ex.name)}</span><b>${esc(setText(ex, pbs.get(ex.id).set))}</b></li>`).join('');
  const sessions = [...state.sessions].reverse().map((s) => {
    const w = WORKOUTS[s.workoutId];
    const body = s.entries.map((e) => {
      const ex = EXERCISES[e.exerciseId];
      if (!ex) return '';
      const sets = e.sets.map((x) => (ex.load === 'bodyweight' ? `${x.reps}` : `${formatKg(x.weight)}×${x.reps}`)).join(', ');
      return `<li><span>${esc(ex.name)}</span><span class="muted">${esc(sets)}</span></li>`;
    }).join('');
    return `
      <details class="card session">
        <summary>
          <span><b>${esc(fmtDate(s.date))}</b> · ${esc(w.name)}</span>
          <span class="muted">${minutes(s.durationSec)} · ${sessionVolume(s).toLocaleString()} kg</span>
        </summary>
        <ul class="list">${body}</ul>
        <button class="btn small ghost danger" data-act="delete-session" data-id="${esc(s.id)}">Delete this workout</button>
      </details>`;
  }).join('');
  return `
    <h2 class="page-title">History</h2>
    <section class="card"><p class="eyebrow">Personal bests</p><ul class="list">${pbRows}</ul></section>
    <p class="eyebrow section-label">${state.sessions.length} workout${state.sessions.length === 1 ? '' : 's'}</p>
    ${sessions}`;
}

function plateHeight(k) {
  return Math.round(Math.min(96, 30 + 34 * Math.sqrt(k / 5)));
}

function rig(option, mode) {
  const plates = [];
  for (const p of option.perSide) for (let i = 0; i < p.n; i++) plates.push(p.kg);
  const el = (k) => `<span class="plate" style="height:${plateHeight(k)}px;width:${Math.round(9 + k * 1.6)}px" title="${formatKg(k)} kg"><i>${formatKg(k)}</i></span>`;
  const left = [...plates].reverse().map(el).join('');
  const right = plates.map(el).join('');
  return `<div class="rig ${mode === 'barbell' ? 'bar' : 'db'}" aria-hidden="true"><span class="sleeve"></span><span class="collar"></span>${left}<span class="grip"></span>${right}<span class="collar"></span><span class="sleeve"></span></div>`;
}

function viewPlates() {
  const mode = ui.platesMode;
  const opts = loadOptions(state.equipment, mode);
  const tabs = ['pair', 'single', 'barbell'].map((m) => `<button class="seg${m === mode ? ' on' : ''}" data-act="plates-mode" data-m="${m}" aria-pressed="${m === mode}">${MODE_LABEL[m]}</button>`).join('');
  if (!opts.length) {
    return `<h2 class="page-title">Plate loader</h2><div class="segs">${tabs}</div><section class="empty"><p class="muted">No plates set up. Add yours in Settings.</p><a class="btn" href="#settings">Open Settings</a></section>`;
  }
  const pick = opts.find((o) => o.total === ui.platesPick) || opts[Math.min(opts.length - 1, Math.floor(opts.length / 3))];
  const top = maxLoad(state.equipment, mode);
  const per = mode === 'pair' ? ' each' : '';
  const chips = opts.map((o) => `<button class="chip${o === pick ? ' on' : ''}" data-act="plates-pick" data-t="${o.total}">${formatKg(o.total)}</button>`).join('');
  const note = mode === 'pair'
    ? 'Both dumbbells loaded the same, so every plate size is used in fours.'
    : mode === 'single'
      ? 'One dumbbell, so you can use plates from both sets.'
      : 'Whole bar, collars included.';
  return `
    <h2 class="page-title">Plate loader</h2>
    <div class="segs">${tabs}</div>
    <section class="card loader">
      <p class="big-weight">${formatKg(pick.total)}<small> kg${per}</small></p>
      ${rig(pick, mode)}
      <p class="load-line">${esc(describeLoad(pick, mode))}</p>
      <label class="target">Find a weight <input class="num" type="text" inputmode="decimal" id="plates-target" placeholder="e.g. 15"></label>
    </section>
    <p class="eyebrow section-label">Every weight you can build${per} · max ${kg(top.total)}</p>
    <div class="chips">${chips}</div>
    <p class="muted small-print">${note}</p>`;
}

function viewSettings() {
  const eq = state.equipment;
  const total = equipmentTotal(eq);
  const plates = eq.plates.map((p, i) => `
    <div class="plate-row">
      <label><span class="sr">Plate ${i + 1} weight</span><input class="num" type="text" inputmode="decimal" data-eq="plate-kg" data-i="${i}" value="${formatKg(p.kg)}"></label>
      <span class="muted">kg ×</span>
      <label><span class="sr">How many</span><input class="num" type="text" inputmode="numeric" data-eq="plate-count" data-i="${i}" value="${p.count}"></label>
      <button class="btn small ghost" data-act="remove-plate" data-i="${i}" aria-label="Remove ${formatKg(p.kg)} kg plates">Remove</button>
    </div>`).join('');
  const goals = [2, 3, 4, 5].map((g) => `<button class="seg${g === state.settings.weeklyGoal ? ' on' : ''}" data-act="goal" data-g="${g}" aria-pressed="${g === state.settings.weeklyGoal}">${g}</button>`).join('');
  return `
    <h2 class="page-title">Settings</h2>
    <section class="card">
      <p class="eyebrow">Your set</p>
      <p class="muted">Match this to what's in your box. 55 kg chrome sets vary, so weigh a handle and the bar on a bathroom scale if you can.</p>
      <div class="field"><label for="eq-handle">Dumbbell handle, each, with collars</label><span class="unit"><input id="eq-handle" class="num" type="text" inputmode="decimal" data-eq="handleKg" value="${formatKg(eq.handleKg)}"> kg</span></div>
      <div class="field"><label for="eq-bar">Barbell bar, with collars</label><span class="unit"><input id="eq-bar" class="num" type="text" inputmode="decimal" data-eq="barKg" value="${formatKg(eq.barKg)}"> kg</span></div>
      <p class="label">Plates</p>
      ${plates}
      <button class="btn small" data-act="add-plate">+ Add plate size</button>
      <div class="field"><label for="eq-dbmax">Most plates that fit on one end of a dumbbell</label><input id="eq-dbmax" class="num" type="text" inputmode="numeric" data-eq="dbSleeveMax" value="${eq.dbSleeveMax}"></div>
      <div class="field"><label for="eq-barmax">Most plates that fit on one end of the bar</label><input id="eq-barmax" class="num" type="text" inputmode="numeric" data-eq="barSleeveMax" value="${eq.barSleeveMax}"></div>
      <p class="total">Everything adds up to <b>${kg(total)}</b>${Math.abs(total - 55) < 0.01 ? ' ✔' : ''}</p>
    </section>
    <section class="card">
      <p class="eyebrow">Workouts per week</p>
      <div class="segs">${goals}</div>
      <p class="muted">Hit this every week to keep your streak alive.</p>
    </section>
    <section class="card">
      <p class="eyebrow">Backup</p>
      <p class="muted">Your data only lives on this phone. Export a backup now and then.</p>
      <div class="row">
        <button class="btn" data-act="export">Export backup</button>
        <button class="btn" data-act="import">Import backup</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
    </section>
    <section class="card">
      <p class="eyebrow">Start over</p>
      <button class="btn ghost danger" data-act="reset">Erase all data</button>
    </section>`;
}

// ---------- routing ----------
function currentRoute() {
  const r = location.hash.replace('#', '') || 'today';
  if (r === 'workout' && !state.active) return 'today';
  return ['today', 'workout', 'done', 'history', 'plates', 'settings'].includes(r) ? r : 'today';
}

function render() {
  const route = currentRoute();
  const html = {
    today: viewToday, workout: viewWorkout, done: viewDone, history: viewHistory, plates: viewPlates, settings: viewSettings,
  }[route]();
  view.innerHTML = html;
  const tab = route === 'workout' || route === 'done' ? 'today' : route;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (route !== ui.route) {
    window.scrollTo(0, 0);
    ui.route = route;
  }
  document.body.classList.toggle('in-workout', route === 'workout');
  if (route === 'workout') keepAwake();
  else releaseAwake();
}

// ---------- workout actions ----------
function startWorkout(workoutId) {
  state.active = {
    workoutId,
    startedAt: Date.now(),
    entries: plannedItems(workoutId).map(({ ex, sets, rest }) => {
      const sug = suggest(ex, state.sessions, state.equipment);
      return {
        exerciseId: ex.id,
        rest,
        note: sug.note,
        trend: sug.trend,
        sets: Array.from({ length: sets }, () => ({ weight: sug.weight, reps: null, target: sug.reps, done: false })),
      };
    }),
  };
  save();
  requestPersistentStorage();
  location.hash = '#workout';
}

function finishWorkout() {
  const a = state.active;
  const entries = a.entries
    .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done).map((s) => ({ weight: s.weight, reps: s.reps ?? 0 })) }))
    .filter((e) => e.sets.length);
  if (!entries.length) {
    if (confirm('No sets ticked off yet. Discard this workout?')) discardWorkout(true);
    return;
  }
  const open = a.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  if (open && !confirm(`${open} set${open === 1 ? '' : 's'} not ticked. Finish anyway?`)) return;
  const session = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    workoutId: a.workoutId,
    durationSec: Math.round((Date.now() - a.startedAt) / 1000),
    entries,
  };
  const prs = findPRs(entries, state.sessions);
  state.sessions.push(session);
  if (PROGRAM.includes(a.workoutId)) state.nextIndex = PROGRAM.indexOf(a.workoutId) + 1;
  state.active = null;
  save();
  stopRest();
  ui.summary = { session, prs };
  location.hash = '#done';
}

function discardWorkout(skipConfirm) {
  if (!skipConfirm && !confirm('Discard this workout? Nothing from it will be saved.')) return;
  state.active = null;
  save();
  stopRest();
  if (location.hash === '#today' || location.hash === '') render();
  else location.hash = '#today';
}

function toggleSet(i, j) {
  const e = state.active.entries[i];
  const s = e.sets[j];
  if (s.done) {
    s.done = false;
  } else {
    if (s.reps == null) s.reps = s.target;
    s.done = true;
    const isLast = i === state.active.entries.length - 1 && e.sets.every((x) => x.done);
    if (!isLast) startRest(e.rest);
  }
  save();
  render();
}

function updateField(input) {
  const i = Number(input.dataset.e);
  const j = Number(input.dataset.s);
  const e = state.active.entries[i];
  const s = e.sets[j];
  const v = parseNum(input.value);
  if (input.dataset.f === 'reps') {
    s.reps = v == null ? null : Math.max(0, Math.round(v));
  } else {
    const old = s.weight;
    s.weight = v == null ? null : Math.max(0, v);
    // Carry a weight change down to the sets you haven't done yet.
    for (let k = j + 1; k < e.sets.length; k++) {
      const later = e.sets[k];
      if (!later.done && later.weight === old) {
        later.weight = s.weight;
        const el = view.querySelector(`input[data-f="weight"][data-e="${i}"][data-s="${k}"]`);
        if (el) el.value = s.weight ?? '';
      }
    }
    const loadEl = view.querySelector(`[data-load="${i}"]`);
    if (loadEl) loadEl.innerHTML = loadText(EXERCISES[e.exerciseId], s.weight);
  }
  save();
}

// ---------- rest timer ----------
let rest = null;
let restTick = null;
let audioCtx = null;

function beep() {
  try {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [0, 0.25].forEach((d) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + d);
      o.stop(t + d + 0.2);
    });
  } catch { /* sound is optional */ }
}

function startRest(seconds) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { audioCtx = null; }
  rest = { endsAt: Date.now() + seconds * 1000, total: seconds, finished: false };
  restEl.hidden = false;
  drawRest();
  clearInterval(restTick);
  restTick = setInterval(drawRest, 250);
}

function stopRest() {
  rest = null;
  clearInterval(restTick);
  restEl.hidden = true;
  restEl.classList.remove('go');
}

function drawRest() {
  if (!rest) return;
  const left = (rest.endsAt - Date.now()) / 1000;
  if (left <= 0 && !rest.finished) {
    rest.finished = true;
    beep();
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch { /* optional */ }
    setTimeout(() => { if (rest && rest.finished) stopRest(); }, 4000);
  }
  const pct = Math.max(0, Math.min(100, (left / rest.total) * 100));
  restEl.classList.toggle('go', rest.finished);
  restEl.innerHTML = rest.finished
    ? '<div class="rest-inner"><span class="rest-time">Go. Next set.</span><button class="btn small" data-act="rest-skip">OK</button></div>'
    : `<div class="rest-inner">
        <span class="rest-label">Rest</span><span class="rest-time">${clock(left)}</span>
        <button class="btn small ghost" data-act="rest-add">+15s</button>
        <button class="btn small" data-act="rest-skip">Skip</button>
      </div>
      <div class="rest-bar"><i style="width:${pct}%"></i></div>`;
}

// ---------- keep the screen on during a workout ----------
let wakeLock = null;
async function keepAwake() {
  try {
    if (!wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { wakeLock = null; }
}
function releaseAwake() {
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentRoute() === 'workout') keepAwake();
});

setInterval(() => {
  const el = document.getElementById('elapsed');
  if (el && state.active) el.textContent = clock((Date.now() - state.active.startedAt) / 1000);
}, 1000);

// ---------- settings actions ----------
function updateEquipment(input) {
  const eq = state.equipment;
  const v = parseNum(input.value);
  const f = input.dataset.eq;
  if (f === 'plate-kg' || f === 'plate-count') {
    const p = eq.plates[Number(input.dataset.i)];
    if (f === 'plate-kg' && v > 0) p.kg = v;
    if (f === 'plate-count' && v != null && v >= 0) p.count = Math.floor(v);
  } else if (v != null && v >= 0) {
    eq[f] = f.endsWith('SleeveMax') ? Math.max(1, Math.floor(v)) : v;
  }
  state.equipment = normalize(state).equipment;
  save();
  render();
}

function exportBackup() {
  const data = { ...state, active: null };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workin-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importBackup(file) {
  try {
    const raw = JSON.parse(await file.text());
    if (!raw || !Array.isArray(raw.sessions)) throw new Error('not a backup');
    const next = normalize(raw);
    if (!confirm(`Replace everything on this phone with this backup (${next.sessions.length} workouts)?`)) return;
    state = next;
    save();
    render();
    toast('Backup restored.');
  } catch {
    toast("That file isn't a Workin backup.");
  }
}

// ---------- events ----------
view.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const d = btn.dataset;
  const i = Number(d.e);
  switch (d.act) {
    case 'start': startWorkout(d.w); break;
    case 'finish': finishWorkout(); break;
    case 'discard': discardWorkout(false); break;
    case 'toggle': toggleSet(i, Number(d.s)); break;
    case 'add-set': {
      const sets = state.active.entries[i].sets;
      const last = sets[sets.length - 1];
      sets.push({ weight: last.weight, reps: null, target: last.target, done: false });
      save(); render(); break;
    }
    case 'remove-set': {
      const sets = state.active.entries[i].sets;
      if (sets.length > 1) sets.pop();
      save(); render(); break;
    }
    case 'delete-session':
      if (confirm('Delete this workout from your history?')) {
        state.sessions = state.sessions.filter((s) => s.id !== d.id);
        save(); render();
      }
      break;
    case 'plates-mode': ui.platesMode = d.m; ui.platesPick = null; render(); break;
    case 'plates-pick': ui.platesPick = Number(d.t); render(); break;
    case 'goal': state.settings.weeklyGoal = Number(d.g); save(); render(); break;
    case 'add-plate': state.equipment.plates.push({ kg: 1, count: 2 }); save(); render(); break;
    case 'remove-plate': state.equipment.plates.splice(Number(d.i), 1); save(); render(); break;
    case 'export': exportBackup(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'reset':
      if (confirm('Erase every workout and setting on this phone? This cannot be undone.')) {
        state = defaultState();
        save();
        stopRest();
        render();
        toast('All data erased.');
      }
      break;
    default: break;
  }
});

view.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.f && state.active) updateField(t);
  if (t.id === 'plates-target') {
    const v = parseNum(t.value);
    if (v == null) return;
    const opt = nearestLoad(state.equipment, ui.platesMode, v);
    if (!opt) return;
    ui.platesPick = opt.total;
    const keep = t.value;
    render();
    const again = document.getElementById('plates-target');
    again.value = keep;
    again.focus();
    again.setSelectionRange(keep.length, keep.length);
  }
});

view.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.eq) updateEquipment(t);
  if (t.id === 'import-file' && t.files && t.files[0]) importBackup(t.files[0]);
});

view.addEventListener('focusin', (ev) => {
  if (ev.target.classList.contains('num')) ev.target.select();
});

restEl.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-act]');
  if (!btn || !rest) return;
  if (btn.dataset.act === 'rest-skip') stopRest();
  if (btn.dataset.act === 'rest-add') { rest.endsAt += 15000; rest.total += 15; drawRest(); }
});

window.addEventListener('hashchange', render);
window.addEventListener('storage', () => { state = loadState(); render(); });

// Tab bar icons
document.querySelectorAll('.tabbar a').forEach((a) => {
  a.insertAdjacentHTML('afterbegin', icon[a.dataset.tab]);
});

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
