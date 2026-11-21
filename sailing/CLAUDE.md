# Sailing game

## Vision

A simple, satisfying 2D sailing game playable in the browser. The player steers a small sailboat around a course of buoys in a harbour, racing the clock. Sailing should feel believable: the boat's speed depends on its angle to the wind, and it cannot sail directly into the wind (it must tack).

## Tech choices

- Plain HTML, CSS and JavaScript using the Canvas API. No build step and no frameworks unless clearly justified.
- Everything must run as static files so it deploys to GitHub Pages.
- Keep code split into ES modules by concern (chart, course, boat, wind, camera, input, rendering, UI). Don't create tiny files: a module should own one clear job.
- Modules don't load from `file://`. Test through a local server: `python3 -m http.server` from the repo root, then open `/sailing/`.
- Browser tests use Playwright and run from the repo root:
  - `uv run --with playwright sailing/tools/race_test.py` races whole courses: start, rounding each mark (the wrong way is refused), finish, best times, reload.
  - `uv run --with playwright sailing/tools/compare_versions.py [REF]` plays the same session against a git ref (default `master`) and the working tree, and reports any difference. Use it for refactors that must not change behaviour.
- Works with keyboard on desktop; touch controls are a later goal.

## How to work (rules for the agent)

1. Each run, pick the top unchecked task from the [To-do list](#to-do-list) below. Do only that one task.
2. Work on a new git branch named after the task. Never commit directly to master.
3. Keep changes small and focused. If a task is too big, split it into smaller tasks in the To-do list and do the first one.
4. After finishing, make sure the game still loads in a browser with no console errors.
5. Write a short entry in `PROGRESS.md`: date, task, what changed, anything to review, and suggested next steps.
6. Do not add new dependencies, delete files outside the project, or change deployment settings without noting it clearly in `PROGRESS.md` for review.
7. If blocked or unsure, write the question in `PROGRESS.md` and stop.

## To-do list

- [x] Split `index.html` into ES modules, with no change in behaviour
- [x] Add leeway, so the boat drifts sideways a little, especially when slow or close-hauled
- [ ] Add simple sound effects
- [ ] Link to the game from the site's home page (`index.md`)

## Later: multiple clubs, maps and courses

Courses are data, not code. Each sailing club or harbour area gets its own course file that the game loads, so new locations can be added without touching game logic.

- **Course file per location (JSON)** holding:
  - club or area name
  - map boundary as GPS coordinates
  - buoy marks with names and GPS positions
  - course order and rounding side (port or starboard)
  - default wind direction and strength
- **Coastlines and land shapes** come from OpenStreetMap data for the map boundary, converted into simple shapes the game can draw and use for collisions.
- **GPS to screen:** the game converts GPS coordinates to screen positions, so real-world mark positions just work.
- **Course picker:** the start screen lists every available course file.

### Club roadmap

1. Royal Sydney Yacht Squadron (existing functionality; convert to the course file format first)
2. Greenwich Flying Squadron
3. Cruising Yacht Club of Australia

### Ingestion workflow (agent task)

1. A new source document goes into an inbox folder, such as a club's sailing instructions or a list of marks with coordinates.
2. The agent extracts the marks, positions and course order, and writes a new course file.
3. The agent fetches the coastline for that area and saves it with the course.
4. The agent validates the course: every mark is on water, the course is sailable, and the game loads it with no errors.
5. The agent logs the new course in `PROGRESS.md`, noting anything uncertain for review, and moves the source document to a processed folder.

### Later to-do list

- [ ] Convert the RSYS data (`rsys-courses.js` and `harbour-data.js`) into the per-location course file format and load it from there
- [ ] Make `tools/build_harbour.py` take its map boundary from a course file instead of hard-coded Sydney Harbour coordinates
- [ ] Add a club/location picker to the start screen (it currently picks only RSYS division and wind)
- [ ] Build the ingestion workflow from an inbox folder
- [ ] Generalise `tools/check_courses.py` so it validates any course file

## Definition of done for each task

- The game runs from `index.html` with no errors.
- The change is visible or testable by playing.
- `PROGRESS.md` is updated.
