# Workin

**Working out, in.** A home workout app built around one adjustable chrome 55 kg dumbbell + barbell set. No gym, no bench, no rack, no excuses.

## What it does

- **Today**: your next workout with the weight to use for every exercise, plus a weekly goal and a streak that counts the weeks you hit it.
- **Program**: alternating full-body days. Day A is Squat & Press and Day B is Hinge & Pull. There's also a **No-Excuse 15** for days when time is short. Everything works on the floor at home.
- **Progression**: each exercise has a rep range. Once you hit the top of the range on every set, the app moves you up to the next weight **your set can actually build**.
- **Plate loader**: shows which plates go on each side for any weight, for a pair of dumbbells, one dumbbell or the barbell. It also warns you when your set can't make a weight.
- **During a workout**: a rest timer that beeps and vibrates, keeps your screen on, and saves your progress if you close the app.
- **History**: every session, total kg lifted and personal bests.
- **Settings**: enter the exact plates in your box, set your weekly goal, and export or import a backup.

The default equipment is a common 55 kg layout: 2 kg handles, a 6 kg bar, 6×5 kg, 4×2.5 kg and 4×1.25 kg plates. **Check this against your box in Settings**, because every set is a little different.

## Run it

It's plain HTML, CSS and JavaScript with no build step.

```sh
npm start          # serves on http://localhost:8080
npm test           # unit tests for the plate maths and progression
```

## Put it on your phone

It's a Progressive Web App, so host it anywhere over HTTPS. GitHub Pages works well: in the repo go to **Settings → Pages → Deploy from branch**. Then open the link on your phone and choose **Add to Home Screen** (iPhone: Share button; Android: ⋮ menu). After that it opens like an app and works offline.

Your data stays on your phone. Use **Export backup** in Settings now and then.

## Code

| File | What's in it |
| --- | --- |
| `js/plates.js` | Which weights the set can build, and how to load them |
| `js/program.js` | Exercises, workouts, progression, PRs, weekly streak |
| `js/store.js` | Saving and loading on the device |
| `js/app.js` | Screens and interactions |
| `sw.js` | Offline caching |
