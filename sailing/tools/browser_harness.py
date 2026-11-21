"""Shared helpers for the browser tests (compare_versions.py, race_test.py).

The game runs in headless Chromium through Playwright with a fake clock: performance.now and
requestAnimationFrame are replaced so a test advances the game frame by frame with window.__step(n, dt).
Google Fonts requests are blocked so canvas text always renders with the same fallback fonts.
"""
import functools
import glob
import http.server
import os
import threading

from playwright.sync_api import Error

FAKE_CLOCK = """
let now = 0; const q = [];
performance.now = () => now;
window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
window.__step = (n, dt) => { for (let i = 0; i < n; i++) { now += dt; q.splice(0).forEach(cb => cb(now)); } };
"""
SEEDED_RANDOM = "let s = 42; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;"


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(root):
    """Serve root over HTTP on a free local port; returns the base URL."""
    handler = functools.partial(_QuietHandler, directory=str(root))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_address[1]}"


def launch(p):
    """Launch Chromium, falling back to any headless shell already in the Playwright cache when the installed
    Playwright expects a browser version that hasn't been downloaded."""
    try:
        return p.chromium.launch()
    except Error:
        shells = sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell")))
        if not shells:
            raise SystemExit("No Chromium found. Run: uv run --with playwright playwright install chromium")
        return p.chromium.launch(executable_path=shells[-1])


def open_game(browser, base_url, init_scripts=(FAKE_CLOCK,), log=None):
    """Open /sailing/ with the fake clock installed; console errors, warnings and page errors go to log."""
    page = browser.new_page(viewport={"width": 1000, "height": 700})
    page.route("**/fonts.g*/**", lambda r: r.abort())
    for s in init_scripts:
        page.add_init_script(s)
    if log is not None:
        page.on("console", lambda m: m.type in ("error", "warning") and "net::ERR_FAILED" not in m.text and log.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: log.append(f"pageerror: {e}"))
    page.goto(f"{base_url}/sailing/")
    wait_ready(page)
    return page


def wait_ready(page):
    page.wait_for_function('typeof window.__step === "function"')
    page.wait_for_timeout(300)  # let the game scripts run their first frame request


def stepper(page):
    """step(n): advance the game n frames at 60 fps."""
    return lambda n: page.evaluate(f"window.__step({n}, 1000/60)")
