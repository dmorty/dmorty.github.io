"""Check that a refactor doesn't change how the game plays.

Plays the same scripted session in the game from a git ref (default: master) and in the working tree, and compares
everything observable after each step: canvas and minimap pixels, the HUD, the course sheet and the finish card.
The session covers every division / wind / flag combination on the setup card, then about a minute of sailing with
steering, trimming, auto-trim, zoom, pan and recenter. Time and Math.random are faked so both runs are identical.

Only useful for changes meant to keep behaviour the same: any gameplay change shows up as differences.

Run from the repo root:
    uv run --with playwright sailing/tools/compare_versions.py [REF]
"""
import hashlib
import pathlib
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

from browser_harness import FAKE_CLOCK, SEEDED_RANDOM, launch, open_game, serve, stepper

REPO = pathlib.Path(__file__).resolve().parents[2]
TEXT = ["spd", "wind", "time", "next", "trimstate", "sheet", "toast", "headline", "result", "blurb"]


def snap(page, tag):
    st = page.evaluate("""ids => {
      const o = {}; for (const id of ids) o[id] = document.getElementById(id).innerHTML;
      o.overlay = document.getElementById('overlay').hidden; o.recenter = document.getElementById('recenter').hidden;
      o.needle = document.getElementById('needle').style.left; o.zone = document.getElementById('zone').style.cssText;
      o.game = document.getElementById('game').toDataURL(); o.mini = document.getElementById('mini').toDataURL();
      return o; }""", TEXT)
    for k in ("game", "mini"):
        st[k] = hashlib.sha1(st[k].encode()).hexdigest()[:12]
    return tag, st


def session(browser, root):
    log, snaps = [], []
    page = open_game(browser, serve(root), (FAKE_CLOCK, SEEDED_RANDOM), log)
    step = stepper(page)
    step(5); snaps.append(snap(page, "load"))

    # every course on the setup card
    for d in page.eval_on_selector_all("#division option", "os => os.map(o => o.value)"):
        page.select_option("#division", d)
        for w in page.eval_on_selector_all("#windsel option", "os => os.map(o => o.value)"):
            page.select_option("#windsel", w)
            for sh in (False, True):
                page.set_checked("#shortened", sh)
                for ki in (False, True):
                    page.set_checked("#kirribilli", ki)
                    step(1); snaps.append(snap(page, f"setup div {d} wind {w} S={sh} O={ki}"))
    page.set_checked("#shortened", False); page.set_checked("#kirribilli", False)
    page.select_option("#division", "1"); page.select_option("#windsel", "NE")

    # a scripted race: start, sail, steer, trim, auto-trim, zoom, pan, recenter
    page.keyboard.press("Enter"); step(30); snaps.append(snap(page, "started"))
    plan = [(None, 240), ("ArrowRight", 40), (None, 200), ("ArrowUp", 30), ("ArrowLeft", 70), (None, 300),
            ("ArrowDown", 40), ("ArrowRight", 25), (None, 400), ("ArrowLeft", 50), (None, 600)]
    for i, (key, n) in enumerate(plan):
        if key: page.keyboard.down(key)
        step(n)
        if key: page.keyboard.up(key)
        snaps.append(snap(page, f"race step {i} ({key or 'no keys'})"))
    page.check("#autotrim"); step(300); snaps.append(snap(page, "auto-trim"))
    page.keyboard.press("+"); step(10); snaps.append(snap(page, "zoom in"))
    page.mouse.move(500, 350); page.mouse.down(); page.mouse.move(380, 300, steps=5); page.mouse.up()
    step(10); snaps.append(snap(page, "panned"))
    page.mouse.wheel(0, 400); step(10); snaps.append(snap(page, "wheel zoom"))
    page.keyboard.press("c"); step(60); snaps.append(snap(page, "recentered"))
    for i in range(6):
        key = "ArrowLeft" if i % 2 else "ArrowRight"
        page.keyboard.down(key); step(45); page.keyboard.up(key)
        step(500); snaps.append(snap(page, f"long sail {i}"))
    page.close()
    return log, snaps


def main():
    ref = sys.argv[1] if len(sys.argv) > 1 else "master"
    with tempfile.TemporaryDirectory() as old_root, sync_playwright() as p:
        archive = subprocess.run(["git", "-C", str(REPO), "archive", ref, "sailing"], check=True, capture_output=True).stdout
        subprocess.run(["tar", "-x", "-C", old_root], input=archive, check=True)
        browser = launch(p)
        (old_log, old), (new_log, new) = session(browser, old_root), session(browser, REPO)
        browser.close()

    print(f"console ({ref}):", old_log or "clean")
    print("console (working tree):", new_log or "clean")
    diffs = 0
    for (tag, a), (_, b) in zip(old, new):
        bad = [k for k in a if a[k] != b[k]]
        if bad:
            diffs += 1
            if diffs <= 5:
                print("DIFF at", tag, {k: (a[k], b[k]) for k in bad})
    print(f"{len(old)} snapshots compared, {diffs} differ")
    sys.exit(1 if diffs or new_log else 0)


if __name__ == "__main__":
    main()
