"""Sanity-check sailing/rsys-courses.js against the chart in sailing/harbour-data.js.

For every division and course: the mark line parses to known marks with one * mark,
every mark and start/finish position is in open water, and the straight-line course
length is compared with the distance printed on the course sheet.

Run from anywhere (standard library only):
    python3 sailing/tools/check_courses.py
"""
import json
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOLERANCE = 0.20  # allowed difference; the sheet distances are approximate and not fully consistent with each other


def load(name):
    text = (ROOT / name).read_text()
    return json.loads(text[text.index("{", text.index("window.")):text.rindex("}") + 1])


def parse(line):
    """'DB(P) – *KP(P) - SM' -> [{'code': 'DB', 'port': True, 'short': False}, ...]"""
    out = []
    for tok in re.split(r"\s*[–—-]\s*", line.strip()):
        m = re.fullmatch(r"(\*?)\s*([A-Z][A-Z0-9]*)\s*(\(P\))?\)?", tok.strip())
        if not m:
            raise ValueError(f"cannot read mark {tok!r} in {line!r}")
        out.append({"code": m.group(2), "port": bool(m.group(3)), "short": bool(m.group(1))})
    return out


def main():
    chart, rsys = load("harbour-data.js"), load("rsys-courses.js")
    m_per_unit = chart["mPerUnit"]

    def xy(p):
        return ((p["lon"] - chart["lon0"]) / chart["lonPerUnit"], (chart["latTop"] - p["lat"]) / chart["latPerUnit"])

    def on_land(x, y):
        inside = False
        for r in chart["land"]:
            n = len(r) // 2
            for i in range(n):
                x1, y1, x2, y2 = r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1]
                if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                    inside = not inside
        return inside

    def shore_m(x, y):
        """Rough distance to the nearest shoreline vertex, in metres."""
        return min(math.hypot(r[i] - x, r[i + 1] - y) for r in chart["land"] for i in range(0, len(r), 2)) * m_per_unit

    problems = 0
    print("Positions (distance to nearest shoreline point):")
    for kind in ("marks", "starts", "finishes"):
        for name, p in rsys[kind].items():
            x, y = xy(p)
            inside = 0 <= x <= chart["W"] and 0 <= y <= chart["H"]
            bad = not inside or on_land(x, y)
            problems += bad
            print(f"  {kind[:-1]:6} {name:16} x{x:6.0f} y{y:6.0f}  {shore_m(x, y):5.0f} m"
                  f"{'  approx' if p.get('approx') else ''}{'  ON LAND / OFF CHART' if bad else ''}")

    print("\nCourses (charted straight-line length vs course sheet):")
    for div, courses in rsys["divisions"].items():
        for num, c in enumerate(courses):
            try:
                marks = parse(c["marks"])
                pts = [rsys["starts"][c["start"]]] + [rsys["marks"][m["code"]] for m in marks] + [rsys["finishes"][c["finish"]]]
            except (ValueError, KeyError) as e:
                problems += 1
                print(f"  Div {div} course {num}: {e!r}")
                continue
            pts = [xy(p) for p in pts]
            nm = sum(math.dist(a, b) for a, b in zip(pts, pts[1:])) * m_per_unit / 1852
            shorts = sum(m["short"] for m in marks)
            off = nm / c["nm"] - 1
            bad = abs(off) > TOLERANCE or shorts != 1
            problems += bad
            print(f"  Div {div} course {num}: {nm:5.1f} nm vs {c['nm']:5.1f} nm ({off:+.0%})"
                  f"{'' if shorts == 1 else f'  {shorts} shortened-course marks'}{'  CHECK' if bad else ''}"
                  f"  {' '.join(('*' if m['short'] else '') + m['code'] + ('(P)' if m['port'] else '') for m in marks)}")

    print(f"\n{problems} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
