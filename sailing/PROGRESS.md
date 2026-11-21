# Progress log

One entry per task, newest first. See the rules in [CLAUDE.md](CLAUDE.md).

<!--
## YYYY-MM-DD — Task name

- **Branch:** `branch-name`
- **What changed:**
- **To review:**
- **Next steps:**
- **Questions:** (if blocked or unsure)
-->

## 2026-11-21 — Add leeway

- **Branch:** `add-leeway`
- **What changed:**
  - `js/boat.js`: the wind now pushes the boat sideways, away from the wind (`boat.drift`, eased in smoothly).
    - The push is strongest close-hauled, fades to nothing on a run, and fades out head to wind.
    - A stopped boat slips about three times as much as one at full speed.
    - It's tuned by one constant, `LEEWAY = 14`, the sideways speed of a stopped boat close-hauled in full wind.
  - Leeway applies only while racing, so the boat stays still behind the start line while the setup card is showing.
  - Running aground also kills the drift.
  - The start card tips now mention it.
- **Testing:**
  - `race_test.py` has two new checks. Close-hauled from a standstill, the boat slips 6 units to leeward in 1 second; on a run, it slips 0.
  - All the existing race checks still pass, and `check_courses.py` reports 0 problems.
  - Leeway measured at speed with auto-trim: about 10° at 45° to the wind (pinching, 4.6 kn), about 4° at 60° (7.8 kn) and under 1° at 135°.
- **To review:**
  - Is 10° when pinching too much? Real dinghies slip about 5-10° when pinched. Lower `LEEWAY` if it feels punishing.
  - `compare_versions.py` against `master` will now show differences in races. That's expected, because this task changes how the boat moves.
- **Next steps:** add simple sound effects.

## 2026-11-21 — Split index.html into ES modules

- **Branch:** `split-into-modules`
- **What changed:**
  - Moved the game's inline script into 12 ES modules under `js/`:
    - `game` (shared state)
    - `util`
    - `chart`
    - `course`
    - `boat`
    - `wind`
    - `camera`
    - `input`
    - `ui`
    - `render`
    - `minimap`
    - `main` (entry point, race logic and frame loop)
  - `index.html` keeps its markup and CSS, and loads `js/main.js` as a module after the two data scripts.
  - State that changes during play lives on the `game` object in `game.js`; camera and screen state lives on `view` in `camera.js`. Modules can't reassign each other's variables.
  - Updated the modules rule in `CLAUDE.md` and added a note that the game must be served over HTTP.
- **Testing:** a headless Chromium script played the `master` version and this branch side by side. It faked the clock, animation frames and `Math.random`, and sent the same keyboard and mouse input to both.
  - All 156 snapshots matched exactly: canvas pixels, minimap, HUD text and the course sheet for every division, wind and flag combination, plus about 60 seconds of steering, trimming, auto-trim, zooming, panning and recentering.
  - A second script raced Division 2 (SW) and Division 3 (race committee's wind) by placing the boat just before each line and rounding gate. Starts were detected, wrong-side roundings refused and correct ones counted. The finish card, saved best times, the setup after a reload and "Race again" all worked.
  - There were no console errors. The tuning constants are unchanged, and `check_courses.py` reports 0 problems.
- **To review:**
  - `finish()` lives in `ui.js` rather than `main.js` as planned, because it mostly updates the finish card and needs the setup state.
  - The scripts in `js/` are no longer readable by opening `index.html` from disk: use `python3 -m http.server`.
- **Later the same day:** kept both test scripts in `tools/`:
  - `race_test.py` races whole courses. A wrong-side check is skipped when that approach starts on the shore: 4 at Point Piper.
  - `compare_versions.py [REF]` plays the same session against a git ref and the working tree.
  - `browser_harness.py` holds the shared fake clock and browser setup.
- **Next steps:** add leeway, the next to-do item.

## 2026-11-21 — Set up the agent workflow

- **Branch:** none (`master`, before the workflow existed)
- **What changed:** Rewrote `CLAUDE.md` in Markdown with the vision, the rules, the to-do lists and the definition of done. Removed the tasks the game already does: the skeleton and game loop, the harbour chart, steering, wind, the speed polar and no-go zone, buoys rounded in order, the timer and finish screen, best times, shifting wind, the start screen and restart, touch controls, the wake and sail animation, and deployment. Created this log.
- **To review:**
  - `CLAUDE.md` asks for small modules, but the game is still one `index.html`.
  - `CLAUDE.md` still calls touch controls a later goal, but they're already built.
- **Next steps:** Start the to-do list with leeway.
