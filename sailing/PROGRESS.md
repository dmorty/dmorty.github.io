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

## 2026-11-21 — Auto-trim on by default

- **Branch:** `start-boat-to-finish`. This is a user request outside the to-do list, made while that branch was unmerged.
- **What changed:** auto-trim now starts on: `game.auto` is `true`, and the HUD checkbox starts ticked. At load the checkbox takes its value from `game.auto`, so a browser restoring an old checkbox state can't leave the two disagreeing.
- **Testing:** `race_test.py` checks that auto-trim starts on. All checks pass.
- **To review:** the choice isn't remembered between visits. Every load starts with auto-trim on.

## 2026-11-21 — Start boat moves to the finish line

- **Branch:** `start-boat-to-finish`
- **What changed:**
  - **New `js/committee.js`:** it owns the start boat, which was previously drawn from fixed course data.
    - The boat waits at the start line until 30 seconds after the player crosses it (`WAIT` in `js/committee.js`, added at the user's request). The start line keeps both ends until the player has started.
    - It then motors at about 9 kn to the finish, with a wake. It slows for sharp turns and for the final approach, and stops to give way if the player's boat is close ahead.
    - It anchors in place of one finish pin and swings to lie head to wind.
  - **Route:** A* over a grid of open-water cells at least 30 units from land, built once and then reused. The path is straightened wherever a clear straight run has room for the hull.
  - **Finish position:** `buildCourse()` adds `course.finishBoat`, 22 units beyond end b of the finish line. If the hull doesn't fit in open water there, it tries end a, then moves closer to the line. The 19 finishes where end b is against the shore use one of the fallbacks.
  - **Drawing:**
    - The finish line shows both pins until the boat arrives; then the pin at the boat's end disappears.
    - The "Finish" label sits at the end that stays a pin.
    - On the minimap the boat's dot follows it and no longer fades after the start.
  - The boat stays solid wherever it is: collision moved from `boat.js` to `committee.js`.
- **Testing:**
  - `race_test.py` has three new checks:
    - the boat is still at the start 29 s after the player starts, and under way by 31 s;
    - in a live race it reaches the finish (7 s on that course) without its centre ever crossing land, and anchors at the right spot;
    - every one of the 120 course combinations (division × wind × flag S × flag O) has a water route, with no point along it on land.
  - All checks pass, with no console errors. Checked in screenshots under way and anchored at the finish.
- **To review:**
  - Speed is `SPEED = 110` (about 9 kn) in `js/committee.js`. On most courses it reaches the finish long before the player, so the player rarely sees it arrive.
  - The route check covers the boat's centre line and a hull-width margin on straightened legs, not every point of the hull on turns.
  - The 30 seconds count from when the player crosses the start line, not from the "Go!" signal.
- **Next steps:** the to-do list is complete. The later list starts with converting the RSYS data into the per-location course file format.

## 2026-11-21 — Link to the game from the site's home page

- **Branch:** `link-game-from-home`
- **What changed:** The site home page (`index.md`, outside `sailing/`) keeps its "Welcome to DMORTY" heading. The "Page coming soon......" placeholder is replaced with an "RSYS Harbour Race" section: a one-line description and a **Play the RSYS Harbour Race** link to `sailing/`.
- **Testing:**
  - The link is relative (`sailing/`), so it works from the site root, where this GitHub Pages user site is served.
  - The game answers at `/sailing/` on the local server.
  - Jekyll isn't installed locally, so the rendered home page wasn't previewed. Check it on the live site after merging.
- **To review:** the placeholder line was removed. Put it back if the home page is meant to say more is coming.
- **Note:** the user had added a new to-do item above this one ("Once the race has started make the start boat make its way to the finish line and replace one of the pins"). This task was done out of order, and that item went into this commit unticked.
- **Next steps:** the start boat moving to the finish line, the one remaining to-do item.

## 2026-11-21 — Add a start boat to one end of the start line

- **Branch:** `add-start-boat`
- **What changed:**
  - **Course:** `buildCourse()` now places a start boat (`course.startBoat`) 22 units beyond the starboard end of the start line. That is the right-hand end looking upwind, where the race committee boat usually sits. The other end stays an orange pin buoy, and the "Start" label moved to the pin end.
  - **Drawing (`js/render.js`):** the start boat is drawn as a motor cruiser lying head to wind. It swings with the wind shifts and flies a fluttering orange flag. It also shows as a dot on the minimap, which fades once the race has started.
  - **Physics (`js/boat.js`):** the start boat is solid, an ellipse a little larger than the drawn hull. Hitting it stops the boat like running aground, with a "Hit the start boat!" toast and the aground thud.
  - The new to-do item was added to `CLAUDE.md` by the user.
- **Testing:**
  - On all 60 start configurations (every division, wind and Kirribilli option), no point of the start boat's hull is on land, and every start line keeps its full length.
  - `race_test.py` has a new check: sailing along the start line into the start boat stops the boat outside its hull, with the toast. All checks pass, with no console errors.
  - Checked in a zoomed screenshot of the start area.
- **To review:**
  - The start boat isn't hit by its own wake and doesn't push the player's boat away. Hitting it is the same as touching the shore.
  - There's no penalty for touching it, as there would be under the racing rules.
  - On the default Division 1 NE course, the boat spawns on top of mark N3. This was already the case before this task.
- **Next steps:** link to the game from the site's home page (`index.md`).

## 2026-11-21 — Add simple sound effects

- **Branch:** `add-sound-effects`
- **What changed:**
  - New `js/sound.js` builds every sound in code with the Web Audio API, so there are no audio files and no new dependencies.
  - Sounds:
    - a start horn on "Go!"
    - a ping on crossing the start line
    - a bell for each mark rounded
    - a double buzz for a wrong-side rounding
    - a thud on running aground
    - a finish gun: a short horn, then a long one
  - Browsers block audio until the player interacts, so audio starts on the first key press or tap. The first race's start horn still plays.
  - Mute with the new "Sound effects" checkbox on the start card, or with M during a race. The setting is saved in `localStorage` (`rsysSound`), and the card's help list now shows the M key.
- **Testing:**
  - `race_test.py` now counts the audio sources the game creates. It checks that sounds play during races, that M mutes them and shows "Sound off", that a muted start-line crossing is silent, that the setting survives a reload, and that the checkbox turns sound back on.
  - All checks pass, with no console errors. The races covered every sound.
  - The start card was checked in screenshots at desktop and phone sizes.
- **To review:** listen to the sounds. The tests prove they play, not that they sound good. Volumes and pitches are in the `SOUNDS` table in `js/sound.js`.
- **Next steps:** link to the game from the site's home page (`index.md`).

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
