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
- **Next steps:** add leeway, the next to-do item.

## 2026-11-21 — Set up the agent workflow

- **Branch:** none (`master`, before the workflow existed)
- **What changed:** Rewrote `CLAUDE.md` in Markdown with the vision, the rules, the to-do lists and the definition of done. Removed the tasks the game already does: the skeleton and game loop, the harbour chart, steering, wind, the speed polar and no-go zone, buoys rounded in order, the timer and finish screen, best times, shifting wind, the start screen and restart, touch controls, the wake and sail animation, and deployment. Created this log.
- **To review:**
  - `CLAUDE.md` asks for small modules, but the game is still one `index.html`.
  - `CLAUDE.md` still calls touch controls a later goal, but they're already built.
- **Next steps:** Start the to-do list with leeway.
