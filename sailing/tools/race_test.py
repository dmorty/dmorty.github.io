"""Race whole courses in the working-tree game and check the race rules and the screens around them.

Instead of steering, the test places the boat just before each objective and lets it sail through:
the start line, each mark's rounding gate (first the wrong way, which must be refused, then the right way) and
the finish line. It then checks the finish card, best-time storage, the setup surviving a reload, and that Enter
starts another race. Fails on any console error or warning.

Run from the repo root:
    uv run --with playwright sailing/tools/race_test.py
"""
import math
import pathlib
import sys

from playwright.sync_api import sync_playwright

from browser_harness import FAKE_CLOCK, launch, open_game, serve, stepper, wait_ready

REPO = pathlib.Path(__file__).resolve().parents[2]
RACES = [("2", "SW"), ("3", "RC")]  # division, wind ("RC" = race committee's pick)

# put the boat 25 units before point c, sailing along unit vector d through it
PLACE = """([cx, cy, dx, dy]) => import('./js/game.js').then(({ game }) => {
  Object.assign(game.boat, { x: cx - dx * 25, y: cy - dy * 25, h: Math.atan2(dx, -dy), v: 120, rudder: 0 });
})"""
OBJ = """i => import('./js/game.js').then(({ game }) =>
  JSON.parse(JSON.stringify({ o: game.course.objs[i], idx: game.objIdx, n: game.course.objs.length, state: game.state })))"""

# count the sounds the game makes: every effect creates at least one oscillator or noise source
AUDIO_SPY = """
window.__sounds = 0;
for (const m of ['createOscillator', 'createBufferSource']) {
  const orig = AudioContext.prototype[m];
  AudioContext.prototype[m] = function () { window.__sounds++; return orig.call(this); };
}
"""

fails, skips = [], []


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


def gate_crossings(o):
    """A point on mark o's rounding gate, and the right and wrong directions to sail across it."""
    ax, ay, bx, by = o["a"]["x"], o["a"]["y"], o["b"]["x"], o["b"]["y"]
    mx, my = ax + (bx - ax) * .3, ay + (by - ay) * .3
    L = ((bx - ax) ** 2 + (by - ay) ** 2) ** .5
    n = (-(by - ay) / L, (bx - ax) / L)
    # the game's rule: crossing along d from p counts when cross(p - mark, d) < 0 is true for a port rounding
    px, py = mx - n[0] * 25 - o["x"], my - n[1] * 25 - o["y"]
    right = n if ((px * n[1] - py * n[0]) < 0) == o["port"] else (-n[0], -n[1])
    return (mx, my), right, (-right[0], -right[1])


def main():
    log = []
    with sync_playwright() as p:
        browser = launch(p)
        page = open_game(browser, serve(REPO), (FAKE_CLOCK, AUDIO_SPY), log)
        step = stepper(page)
        toast = lambda: page.text_content("#toast")
        obj = lambda i: page.evaluate(OBJ, i)

        for d, wind in RACES:
            page.select_option("#division", d); page.select_option("#windsel", wind)
            page.click("#start"); step(2)
            first = obj(0)
            check(first["state"] == "racing" and toast() == "Go!", f"division {d}, {wind} wind: race started")
            for i in range(first["n"]):
                o = obj(i)["o"]
                if o["kind"] == "start":
                    page.evaluate(PLACE, [o["x"], o["y"], o["dir"]["x"], o["dir"]["y"]]); step(30)
                    check(toast() == "Started" and obj(i)["idx"] == 1, "  start line crossed")
                elif o["kind"] == "mark":
                    (mx, my), right, wrong = gate_crossings(o)
                    page.evaluate(PLACE, [mx, my, *wrong]); step(30)
                    if toast() == "Aground!":  # the wrong-side approach starts on the shore: nothing to test here
                        print(f"skip   {o['code']}: wrong-side approach runs aground")
                        skips.append(o["code"])
                    else:
                        check(toast().startswith(f"Leave {o['code']} to") and obj(i)["idx"] == i, f"  {o['code']}: wrong side refused")
                    page.evaluate(PLACE, [mx, my, *right]); step(30)
                    check(obj(i)["idx"] == i + 1 and toast() == f"{o['code']} ✓", f"  {o['code']}: rounded")
                else:
                    page.evaluate(PLACE, [o["x"], o["y"], o["dir"]["x"], o["dir"]["y"]]); step(30)
                    check(page.is_visible("#overlay") and page.text_content("#headline") == "New best time", "  finished: new best time card")
                    check(page.text_content("#start") == "Race again", '  "Race again" button')
            if wind == "RC":
                check(page.input_value("#windsel") == "RC", "  race committee's pick kept for the next race")
        best = page.evaluate("JSON.parse(localStorage.getItem('rsysBest'))") or {}
        check(len(best) == len(RACES), f"best times stored for {len(RACES)} courses: {sorted(best)}")

        sounds = page.evaluate("window.__sounds")
        check(sounds > 0, f"sound effects played during the races ({sounds} sources)")

        page.reload(); wait_ready(page); step(2)
        last_d, last_w = RACES[-1]
        check(page.input_value("#division") == last_d and page.input_value("#windsel") == last_w, "setup persists after reload")
        page.select_option("#division", RACES[0][0]); page.select_option("#windsel", RACES[0][1]); step(1)
        check("best" in page.text_content("#sheet"), "best time shown on the course sheet")
        page.keyboard.press("Enter"); step(2)
        check(toast() == "Go!", "Enter starts another race")

        # leeway: from the spawn (stopped, close-hauled on starboard tack) the boat slips to port, away from the wind;
        # on a run it barely slips
        def slip(frames):
            start = page.evaluate("import('./js/game.js').then(({ game }) => ({ ...game.boat }))")
            step(frames)
            end = page.evaluate("import('./js/game.js').then(({ game }) => ({ ...game.boat }))")
            dx, dy = end["x"] - start["x"], end["y"] - start["y"]
            return dx * math.cos(start["h"]) + dy * math.sin(start["h"])  # sideways distance, + to starboard
        close = slip(60)
        check(close < -4, f"close-hauled from a standstill, the boat slips to leeward ({close:.1f} units in 1 s)")
        page.evaluate("""import('./js/game.js').then(({ game }) =>
          Object.assign(game.boat, { h: game.windFrom + Math.PI, v: 0, drift: 0 }))""")
        step(30)  # let the speed build on the run
        run = slip(60)
        check(abs(run) < abs(close) / 4, f"on a run it barely slips ({run:.1f} units in 1 s)")
        # the start boat at the starboard end of the start line is solid: sail along the line into it
        page.evaluate("""import('./js/game.js').then(({ game }) => {
          const st = game.course.objs[0], sb = game.course.startBoat, l = Math.hypot(st.b.x - st.a.x, st.b.y - st.a.y);
          const dx = (st.b.x - st.a.x) / l, dy = (st.b.y - st.a.y) / l;
          game.groundT = -9;
          Object.assign(game.boat, { x: sb.x - dx * 90, y: sb.y - dy * 90, h: Math.atan2(dx, -dy), v: 120, drift: 0, rudder: 0 });
        })""")
        step(60)
        stopped = page.evaluate("""import('./js/game.js').then(({ game }) => {
          const sb = game.course.startBoat; return Math.hypot(game.boat.x - sb.x, game.boat.y - sb.y); })""")
        check(toast() == "Hit the start boat!" and stopped > 20, f"the start boat is solid (stopped {stopped:.0f} units from its centre)")

        # M mutes: crossing the start line again makes no sound, and the setting survives a reload
        page.keyboard.press("m"); step(1)
        check(page.text_content("#toast") == "Sound off" and not page.is_checked("#sound"), "M turns sound off")
        before = page.evaluate("window.__sounds")
        o = obj(0)["o"]
        page.evaluate(PLACE, [o["x"], o["y"], o["dir"]["x"], o["dir"]["y"]]); step(30)
        check(toast() == "Started" and page.evaluate("window.__sounds") == before, "no sound while muted")
        page.reload(); wait_ready(page); step(1)
        check(not page.is_checked("#sound"), "sound setting persists after reload")
        page.check("#sound"); page.click("#start"); step(2)
        check(page.evaluate("window.__sounds") > 0, "sound back on from the start card checkbox")
        # after the start, the start boat motors to the finish without touching land and anchors in place of a pin
        o = obj(0)["o"]
        page.evaluate(PLACE, [o["x"], o["y"], o["dir"]["x"], o["dir"]["y"]]); step(30)
        trip = page.evaluate("""async () => {
          const { committee } = await import('./js/committee.js'); const { isLand } = await import('./js/chart.js');
          const { game } = await import('./js/game.js');
          window.__step(60 * 29, 1000 / 60); const waited = committee.state;
          window.__step(60 * 2, 1000 / 60); const went = committee.state; let onLand = 0, frames = 0;
          while (committee.state !== 'finish' && frames < 60 * 300) {
            window.__step(1, 1000 / 60); frames++;
            if (isLand(committee.x, committee.y)) onLand++;
          }
          const fb = game.course.finishBoat;
          return { waited, went, state: committee.state, secs: frames / 60, onLand, off: Math.hypot(committee.x - fb.x, committee.y - fb.y) };
        }""")
        check(trip["waited"] == "start" and trip["went"] == "motoring", "the start boat waits 30 s after the player starts, then leaves")
        check(trip["state"] == "finish" and trip["off"] < 1 and not trip["onLand"],
              f"it reaches the finish in {trip['secs']:.0f} s without crossing land, and anchors at the pin's end")

        # every course has a water route for the start boat from the start to the finish
        routes = page.evaluate("""async () => {
          const { RS, buildCourse } = await import('./js/course.js'); const { findPath } = await import('./js/committee.js');
          const { isLand } = await import('./js/chart.js');
          const bad = []; let n = 0;
          for (const division of Object.keys(RS.divisions)) for (const w of RS.winds)
            for (const shortened of [false, true]) for (const kirribilli of [false, true]) {
              const c = buildCourse({ division, wind: w.name, shortened, kirribilli }), path = findPath(c.startBoat, c.finishBoat); n++;
              let land = !path;
              for (let i = 1; path && i < path.length; i++) {
                const p = path[i - 1], q = path[i], k = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 5);
                for (let j = 0; j <= k; j++) if (isLand(p.x + (q.x - p.x) * j / k, p.y + (q.y - p.y) * j / k)) land = true;
              }
              if (land) bad.push(c.key);
            }
          return { n, bad }; }""")
        check(not routes["bad"], f"water route from start to finish on all {routes['n']} courses {routes['bad'] or ''}")
        check(not log, f"no console errors or warnings {log or ''}")
        browser.close()

    print(f"{'ALL PASSED' if not fails else f'{len(fails)} FAILED'}" + (f" ({len(skips)} wrong-side checks skipped)" if skips else ""))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
