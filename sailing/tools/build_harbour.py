"""Build sailing/harbour-data.js from OpenStreetMap data.

Water = the "Port Jackson" harbour multipolygon (OSM relation 15522136) plus the
open sea seaward of natural=coastline. Land = everything else in the box.
Everything is projected into the game's square world (y down, origin top-left).

Run from the repo root:
    uv run --with shapely --with requests sailing/tools/build_harbour.py
Options:
    --cache DIR       reuse/save the raw Overpass responses in DIR
    --preview FILE    also render a PNG preview (needs: --with matplotlib)

Map data © OpenStreetMap contributors, ODbL.
"""
import argparse
import json
import math
import pathlib
import time

import requests
from shapely.geometry import LineString, box
from shapely.ops import linemerge, polygonize, unary_union

OVERPASS = "https://overpass-api.de/api/interpreter"
PORT_JACKSON = 15522136

WORLD = 3600                     # world is WORLD x WORLD units
LON0, LAT_TOP, LAT_BOT = 151.200, -33.790, -33.875
KY = 110574.0                    # metres per degree latitude
KX = math.cos(math.radians((LAT_TOP + LAT_BOT) / 2)) * 111320.0
M_PER_UNIT = (LAT_TOP - LAT_BOT) * KY / WORLD
LON1 = LON0 + WORLD * M_PER_UNIT / KX

# Race marks and courses live in sailing/rsys-courses.js (check them with tools/check_courses.py).
LABELS = [
    # (text, lat, lon, kind) — kind "water" is drawn italic
    ("Harbour Bridge", -33.8523, 151.2108, "land"),
    ("Opera House", -33.8572, 151.2153, "land"),
    ("Kirribilli", -33.8470, 151.2170, "land"),
    ("Mosman", -33.8290, 151.2440, "land"),
    ("Point Piper", -33.8665, 151.2525, "land"),
    ("Rose Bay", -33.8640, 151.2665, "water"),
    ("Vaucluse", -33.8580, 151.2790, "land"),
    ("Watsons Bay", -33.8455, 151.2840, "land"),
    ("South Head", -33.8355, 151.2870, "land"),
    ("North Head", -33.8190, 151.2990, "land"),
    ("Manly", -33.7990, 151.2860, "land"),
    ("Middle Harbour", -33.8150, 151.2470, "water"),
    ("North Harbour", -33.8030, 151.2700, "water"),
    ("Port Jackson", -33.8420, 151.2560, "water"),
]


def proj(lon, lat):
    return ((lon - LON0) * KX / M_PER_UNIT, (LAT_TOP - lat) * KY / M_PER_UNIT)


def overpass(query, cache, name):
    path = cache / name if cache else None
    if path and path.exists():
        return json.loads(path.read_text())
    for attempt in range(4):  # the public server often answers 429/504 when busy
        r = requests.post(OVERPASS, data={"data": query}, timeout=180,
                          headers={"User-Agent": "harbour-buoy-race-build/1.0"})
        if r.status_code not in (429, 502, 503, 504):
            break
        time.sleep(10 * (attempt + 1))
    r.raise_for_status()
    if path:
        path.write_text(r.text)
    return r.json()


def way_line(geom):
    return LineString([proj(p["lon"], p["lat"]) for p in geom])


def rings_to_polys(lines):
    return list(polygonize(linemerge(lines)))


def harbour_water(cache):
    d = overpass(f"[out:json][timeout:170];rel({PORT_JACKSON});out geom;", cache, "port_jackson.json")
    members = d["elements"][0]["members"]
    outer = [way_line(m["geometry"]) for m in members if m["type"] == "way" and m["role"] == "outer"]
    inner = [way_line(m["geometry"]) for m in members if m["type"] == "way" and m["role"] == "inner"]
    return unary_union(rings_to_polys(outer)).difference(unary_union(rings_to_polys(inner))).buffer(0)


def sea_water(cache, world):
    """Faces of the box cut by the coastline that lie on the sea side (coastline ways have land on their left)."""
    pad = 0.01
    q = (f'[out:json][timeout:170];way["natural"="coastline"]'
         f'({LAT_BOT - pad},{LON0 - pad},{LAT_TOP + pad},{LON1 + pad});out geom;')
    ways = [way_line(w["geometry"]) for w in overpass(q, cache, "coastline.json")["elements"]]
    segs = [(a, b) for w in ways for a, b in zip(w.coords, w.coords[1:])]
    noded = unary_union([w.intersection(world) for w in ways] + [world.exterior])
    sea = []
    for face in polygonize(noded):
        p = face.representative_point()
        a, b = min(segs, key=lambda s: LineString(s).distance(p))
        cross = (b[0] - a[0]) * (p.y - a[1]) - (b[1] - a[1]) * (p.x - a[0])
        if cross > 0:  # y is down, so "right of the way" (sea) is a positive cross product
            sea.append(face)
    return unary_union(sea)


def ring_coords(ring):
    pts = [(round(x), round(y)) for x, y in ring.coords[:-1]]
    return [v for xy in pts for v in xy]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", type=pathlib.Path)
    ap.add_argument("--preview", type=pathlib.Path)
    args = ap.parse_args()
    if args.cache:
        args.cache.mkdir(parents=True, exist_ok=True)

    world = box(0, 0, WORLD, WORLD)
    water = unary_union([harbour_water(args.cache).buffer(0.5), sea_water(args.cache, world).buffer(0.5)])
    land = world.difference(water).simplify(1.5)
    polys = [g for g in getattr(land, "geoms", [land]) if g.area > 30]
    land = unary_union(polys)

    rings = []
    for g in polys:
        rings.append(ring_coords(g.exterior))
        rings += [ring_coords(h) for h in g.interiors]

    labels = [{"text": t, "x": round(proj(lon, lat)[0]), "y": round(proj(lon, lat)[1]), "kind": k}
              for t, lat, lon, k in LABELS]

    data = {
        "W": WORLD, "H": WORLD, "mPerUnit": round(M_PER_UNIT, 4),
        "lon0": LON0, "latTop": LAT_TOP,
        "lonPerUnit": M_PER_UNIT / KX, "latPerUnit": M_PER_UNIT / KY,
        "labels": labels, "land": rings,
    }
    out = pathlib.Path(__file__).resolve().parent.parent / "harbour-data.js"
    out.write_text("// Generated by tools/build_harbour.py. Map data © OpenStreetMap contributors, ODbL.\n"
                   f"window.HARBOUR = {json.dumps(data, separators=(',', ':'))};\n")
    pts = sum(len(r) // 2 for r in rings)
    print(f"{out.name}: {out.stat().st_size / 1024:.0f} KB, {len(rings)} rings, {pts} points, "
          f"{land.area / world.area:.0%} land, {M_PER_UNIT:.2f} m/unit, lon {LON0}..{LON1:.4f}")

    if args.preview:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(10, 10))
        for g in polys:
            ax.fill(*g.exterior.xy, color="#ece3c4", ec="#12323b", lw=0.6)
            for h in g.interiors:
                ax.fill(*h.xy, color="#c4dfe0")
        for lab in labels:
            ax.text(lab["x"], lab["y"], lab["text"], fontsize=7, color="#555",
                    style="italic" if lab["kind"] == "water" else "normal")
        ax.set_facecolor("#c4dfe0")
        ax.set_xlim(0, WORLD); ax.set_ylim(WORLD, 0); ax.set_aspect(1)
        fig.savefig(args.preview, dpi=90, bbox_inches="tight")


if __name__ == "__main__":
    main()
