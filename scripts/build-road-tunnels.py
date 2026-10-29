#!/usr/bin/env python3
"""One-time script: builds src/data/road-tunnels.json, the driving route of
each of our rental-car days in the Japan Alps with every road tunnel along
it, plus the other tunnels near those roads (for detours and day trips), for
the map's tunnel view.

Source: Overture Maps transportation segments (road subtype), which carry
OpenStreetMap's road geometry with explicit `is_tunnel` / `is_covered`
ranges (ODbL). The input is a local extract made by
scripts/extract-overture-roads.py.

Each drive is the fastest path over the road network between two hotels,
using a typical speed per road class (expressways where they exist, like a
navigation app would). Consecutive tunnel road is one tunnel; runs shorter
than MIN_TUNNEL_M are dropped (underpasses and the like).

Tunnel names: Overture keeps only a few, so the rest come from a HOT OSM
roads export (hotosm_jpn_roads_lines_gpkg.zip from the HOT raw data API),
matched by geometry.

Usage: python3 scripts/build-road-tunnels.py alps_roads.parquet [hotosm_jpn_roads_lines.gpkg]
Needs: pip install pyarrow shapely
"""

import heapq
import json
import math
import sys
from pathlib import Path

import pyarrow.parquet as pq
from shapely import wkb
from shapely.geometry import LineString
from shapely.ops import substring

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "road-tunnels.json"

MIN_TUNNEL_M = 100
MIN_COVERED_M = 100
# Tunnels near the route (not on it) worth showing for a detour.
NEARBY_MIN_M = 300
NEARBY_KM = 15
SEAM_M = 40
SIMPLIFY_DEG = 0.00012

# Hotel stops (route-public.json orders) the car days run between.
HOTELS = {
    7: ("קנאזאווה", 36.578, 136.6485),
    8: ("שיראקאווה-גו", 36.26645, 136.90162),
    9: ("טקאיאמה", 36.1385, 137.25532),
    10: ("היראיו אונסן", 36.19197, 137.55165),
    11: ("מצומוטו", 36.23267, 137.97147),
    12: ("קיסו-פוקושימה", 35.85928, 137.70502),
    13: ("נאקאטסוגאווה", 35.49438, 137.50113),
    14: ("נגויה", 35.1709, 136.8815),
}
DRIVES = [(7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (12, 13), (13, 14)]

# Typical driving speed (km/h) per road class: the route cost, and the
# estimate of time spent inside each tunnel.
SPEED = {
    "motorway": 80,
    "trunk": 50,
    "primary": 45,
    "secondary": 38,
    "tertiary": 32,
    "unclassified": 25,
    "residential": 18,
}
LINK_SPEED = 40

# Hebrew names and notes for the tunnels that matter most, matched by
# location and length (never guessed): (hebrew, japanese, official length m,
# approx. midpoint, note).
KNOWN_TUNNELS = [
    ("מנהרת ג'והאנה", "城端トンネル", 3192, (36.4709, 136.8779),
     "בכביש המהיר טוקאי-הוקוריקו, בדרך מקנאזאווה לשיראקאווה-גו."),
    ("מנהרת האקאמאגושי", "袴腰トンネル", 5932, (36.4296, 136.8765),
     "כמעט 6 ק\"מ מתחת להרי גוקאיאמה, הארוכה בדרך לשיראקאווה-גו."),
    ("מנהרת צובאקיהארה", "椿原トンネル", 2680, (36.3248, 136.8903), None),
    ("מנהרת אריגהארה", "有家ヶ原トンネル", 1780, (36.3042, 136.9003), None),
    ("מנהרת הידה", "飛騨トンネル", 10710, (36.2395, 136.9499),
     "מהארוכות בכבישי יפן (כ-10.7 ק\"מ), מתחת להר מומיונוקה. צינור אחד עם נתיב לכל כיוון, תנועה נגדית בלי הפרדה, כ-8 דקות בפנים."),
    ("מנהרת קוטורי", "小鳥トンネル", 4330, (36.139, 137.1148),
     "המנהרה הארוכה בכביש המהיר טקאיאמה-קיומי (מעל 4 ק\"מ)."),
    ("מנהרת היראיו", "平湯トンネル", 2430, (36.1819, 137.5271),
     "על כביש 158, בירידה מהמעבר אל היראיו אונסן."),
    ("מנהרת אבו", "安房トンネル", 4370, (36.1993, 137.5816),
     "כביש אגרה מתחת למעבר אבו, ליד הר הגעש הפעיל יאקה-דאקה. עולה ויורדת בשיפוע ניכר."),
    ("מנהרת טוריי", "鳥居トンネル", 1738, (35.947, 137.7983),
     "מתחת למעבר טוריי בכביש 19, בכניסה לעמק קיסו."),
    ("מנהרת אנאסן", "恵那山トンネル", 8550, (35.4603, 137.6678),
     "בכביש המהיר צ'ואו מזרחית לנאקאטסוגאווה, כ-8.5 ק\"מ (שני צינורות). לא על המסלול שלנו."),
    ("מנהרת גונבאי", "権兵衛トンネル", 4467, (35.8854, 137.8418),
     "בין עמק קיסו לעמק אינה. לא על המסלול שלנו."),
]
NAME_MATCH_KM = 4.0
NAME_MATCH_RATIO = 0.12

# Stretches with a warning worth reading before the drive.
AREA_NOTES = [
    # Route 158 at the Nagawado dam: a run of old, narrow tunnels.
    ((36.125, 137.712, 36.142, 137.737),
     "קטע נאגאוואדו בכביש 158: רצף של מנהרות ישנות וצרות (כ-5.8 מ') עם עיקולים חדים ביניהן, ועבודות הרחבה. לנסוע לאט ולצפות לאוטובוסים מולכם."),
    # Route 158 along the Azusa river, Nakanoyu to the Nagawado dam.
    ((36.13, 137.60, 36.21, 137.712),
     "כביש 158 לאורך נהר אזוסה: הרבה מנהרות קצרות וגגוני שלג ברצף, חלקן ישנות וצרות."),
]


def haversine_m(a, b):
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def key(p):
    return (round(p[0], 7), round(p[1], 7))


def flag_ranges(flags, name):
    out = []
    for f in flags or []:
        if name in (f.get("values") or []):
            rng = f.get("between")
            out.append(tuple(rng) if rng else (0.0, 1.0))
    return out


def speed_of(cls, subclass):
    if subclass == "link":
        return LINK_SPEED
    return SPEED.get(cls, 20)


def is_tunnel_name(value):
    return bool(value) and ("トンネル" in value or "隧道" in value or "覆道" in value)


def clean_tunnel_name(value):
    """"国道306号（鞍掛峠トンネル）" / "西横山バイパス;鉄嶺トンネル" -> the tunnel part."""
    for part in value.replace("（", ";").replace("）", ";").replace("(", ";").replace(")", ";").split(";"):
        if is_tunnel_name(part):
            return part.strip()
    return value.strip()


def tunnel_names(names):
    """(between, name) for every name rule that names a tunnel."""
    out = []
    primary = (names or {}).get("primary") or ""
    if is_tunnel_name(primary):
        out.append(((0.0, 1.0), clean_tunnel_name(primary)))
    for rule in (names or {}).get("rules") or []:
        if is_tunnel_name(rule.get("value")):
            rng = rule.get("between")
            out.append((tuple(rng) if rng else (0.0, 1.0), clean_tunnel_name(rule["value"])))
    return out


# Minor roads are only needed for the last stretch to each hotel.
MINOR = {"unclassified", "residential"}
MINOR_NEAR_DEG = 0.04
CLOSED = ("is_under_construction", "is_abandoned")


def near_a_hotel(coord):
    return any(abs(coord[0] - lat) < MINOR_NEAR_DEG and abs(coord[1] - lon) < MINOR_NEAR_DEG for _, lat, lon in HOTELS.values())


def load_roads(path):
    rows = pq.read_table(path, columns=["id", "names", "class", "subclass", "road_flags", "geometry"]).to_pylist()
    roads = []
    for r in rows:
        g = wkb.loads(r["geometry"])
        if g.geom_type != "LineString" or len(g.coords) < 2:
            continue
        if r["class"] in MINOR and not near_a_hotel((g.coords[0][1], g.coords[0][0])):
            continue
        flags = r["road_flags"]
        tunnels = flag_ranges(flags, "is_tunnel")
        covered = flag_ranges(flags, "is_covered")
        closed = [rng for c in CLOSED for rng in flag_ranges(flags, c)]
        named = tunnel_names(r["names"])
        cuts = sorted({0.0, 1.0, *[x for rng in tunnels + covered + closed for x in rng]})
        coords, kinds, piece_names = [], [], []
        for a, b in zip(cuts, cuts[1:]):
            if b - a <= 0:
                continue
            piece = substring(g, a, b, normalized=True) if len(cuts) > 2 else g
            pts = [(lat, lon) for lon, lat in piece.coords]
            mid = (a + b) / 2
            kind = (
                "closed" if any(x <= mid <= y for x, y in closed)
                else "tunnel" if any(x <= mid <= y for x, y in tunnels)
                else "covered" if any(x <= mid <= y for x, y in covered)
                else "open"
            )
            piece_name = next((n for (x, y), n in named if x <= mid <= y), None) if kind != "open" else None
            if coords:
                pts = pts[1:]
            for p in pts:
                if coords:
                    kinds.append(kind)
                    piece_names.append(piece_name)
                coords.append(p)
        if len(coords) < 2:
            continue
        names = r["names"] or {}
        primary = names.get("primary") or ""
        roads.append({
            "cls": r["class"],
            "sub": r["subclass"] or ("link" if flag_ranges(flags, "is_link") == [(0.0, 1.0)] else None),
            "name": "" if is_tunnel_name(primary) else primary,
            "coords": coords,
            "kinds": kinds,
            "names": piece_names,
        })
    return roads


def build_graph(roads):
    graph = {}
    for i, road in enumerate(roads):
        speed = speed_of(road["cls"], road["sub"]) / 3.6
        for j, (a, b, kind) in enumerate(zip(road["coords"], road["coords"][1:], road["kinds"])):
            if kind == "closed":
                continue
            d = haversine_m(a, b)
            ka, kb = key(a), key(b)
            edge = (i, j)
            graph.setdefault(ka, []).append((kb, d / speed, d, kind, edge))
            graph.setdefault(kb, []).append((ka, d / speed, d, kind, edge))
    return graph


def nearest_node(graph, roads, point):
    best, best_d = None, math.inf
    for road in roads:
        if road["cls"] in ("motorway", "trunk") or road["sub"] == "link":
            continue
        for p, kind in zip(road["coords"], ["open", *road["kinds"]]):
            if kind != "open":
                continue
            if abs(p[0] - point[0]) > 0.03 or abs(p[1] - point[1]) > 0.03:
                continue
            d = haversine_m(p, point)
            if d < best_d:
                best, best_d = key(p), d
    return best, best_d


def shortest(graph, start, goal):
    dist = {start: 0.0}
    prev = {}
    heap = [(0.0, start)]
    while heap:
        t, node = heapq.heappop(heap)
        if node == goal:
            break
        if t > dist.get(node, math.inf):
            continue
        for nxt, w, d, kind, road in graph[node]:
            nt = t + w
            if nt < dist.get(nxt, math.inf):
                dist[nxt] = nt
                prev[nxt] = (node, d, kind, road)
                heapq.heappush(heap, (nt, nxt))
    if goal not in prev:
        raise SystemExit("no path")
    path = []
    node = goal
    while node != start:
        p, d, kind, road = prev[node]
        path.append((node, d, kind, road))
        node = p
    path.append((start, 0.0, "open", None))
    path.reverse()
    return path, dist[goal]


def simplify(coords):
    if len(coords) < 3:
        return [[round(a, 5), round(b, 5)] for a, b in coords]
    line = LineString([(lon, lat) for lat, lon in coords]).simplify(SIMPLIFY_DEG, preserve_topology=False)
    return [[round(lat, 5), round(lon, 5)] for lon, lat in line.coords]


def known_for(length_m, point):
    for he, ja, official, mid, note in KNOWN_TUNNELS:
        if haversine_m(point, mid) <= NAME_MATCH_KM * 1000 and abs(length_m - official) <= official * NAME_MATCH_RATIO:
            return he, ja, note
    return None


def area_note(point):
    for (s, w, n, e), note in AREA_NOTES:
        if s <= point[0] <= n and w <= point[1] <= e:
            return note
    return None


def midpoint(coords):
    total = sum(haversine_m(a, b) for a, b in zip(coords, coords[1:]))
    walked = 0.0
    for a, b in zip(coords, coords[1:]):
        d = haversine_m(a, b)
        if walked + d >= total / 2 and d > 0:
            f = (total / 2 - walked) / d
            return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
        walked += d
    return coords[-1]


def describe_tunnel(kind, coords, length_m, start_m, edges, roads, hot):
    by_road = {}
    by_name = {}
    for (i, j), d in edges.items():
        by_road[i] = by_road.get(i, 0) + d
        name = roads[i]["names"][j]
        if name:
            by_name[name] = by_name.get(name, 0) + d
    road = roads[max(by_road, key=by_road.get)]
    mid = midpoint(coords)
    known = known_for(length_m, mid) if kind == "tunnel" else None
    name_ja = (
        known[1] if known
        else max(by_name, key=by_name.get) if by_name
        else hot_name(hot, coords, length_m)
    )
    out = {
        "kind": kind,
        "lengthM": int(round(length_m, -1)),
        "startKm": round(start_m / 1000, 2),
        "speedKmh": speed_of(road["cls"], road["sub"]),
        "start": [round(coords[0][0], 5), round(coords[0][1], 5)],
        "end": [round(coords[-1][0], 5), round(coords[-1][1], 5)],
        "road": road["name"] or None,
    }
    if known:
        out["name"] = known[0]
        if known[2]:
            out["note"] = known[2]
    if name_ja:
        out["nameJa"] = name_ja
    note = area_note(mid)
    if note and kind == "tunnel":
        out["note"] = note if "note" not in out else out["note"] + " " + note
    return out


def build_drive(frm, to, path, roads, hot):
    runs = []
    pos = 0.0
    for i in range(1, len(path)):
        a = path[i - 1][0]
        b, d, kind, road = path[i]
        if runs and runs[-1]["kind"] == kind:
            runs[-1]["coords"].append(b)
            runs[-1]["length"] += d
            runs[-1]["roads"][road] = runs[-1]["roads"].get(road, 0) + d
        else:
            runs.append({"kind": kind, "coords": [a, b], "length": d, "start_m": pos, "roads": {road: d}})
        pos += d
    total = pos

    for i in range(1, len(runs) - 1):
        r = runs[i]
        if r["kind"] != "tunnel" and r["length"] < SEAM_M and runs[i - 1]["kind"] == runs[i + 1]["kind"] == "tunnel":
            r["kind"] = "tunnel"
    merged = []
    for run in runs:
        kind = run["kind"]
        if kind == "tunnel" and run["length"] < MIN_TUNNEL_M:
            kind = "open"
        if kind == "covered" and run["length"] < MIN_COVERED_M:
            kind = "open"
        if merged and merged[-1]["kind"] == kind:
            m = merged[-1]
            m["coords"].extend(run["coords"][1:])
            m["length"] += run["length"]
            for r, d in run["roads"].items():
                m["roads"][r] = m["roads"].get(r, 0) + d
        else:
            merged.append({**run, "kind": kind, "roads": dict(run["roads"])})

    segments = []
    tunnels = []
    for run in merged:
        coords = run["coords"] if run["kind"] != "open" else None
        segments.append({
            "kind": run["kind"],
            "coords": [[round(a, 5), round(b, 5)] for a, b in run["coords"]] if coords else simplify(run["coords"]),
        })
        if run["kind"] != "open":
            tunnels.append(
                describe_tunnel(run["kind"], run["coords"], run["length"], run["start_m"], run["roads"], roads, hot)
            )
    used = {}
    for _, d, _, edge in path[1:]:
        cls = roads[edge[0]]["cls"] if edge is not None else "?"
        used[cls] = used.get(cls, 0) + d
    return {
        "id": f"drive-{frm}-{to}",
        "label": None,
        "from": HOTELS[frm][0],
        "to": HOTELS[to][0],
        "fromOrder": frm,
        "toOrder": to,
        "lengthKm": round(total / 1000, 1),
        "motorwayKm": round(used.get("motorway", 0) / 1000, 1),
        "segments": segments,
        "tunnels": tunnels,
    }


def nearby_tunnels(roads, drives, hot):
    """Every other tunnel within NEARBY_KM of our driving routes."""
    on_route = set()
    for drive in drives:
        for t in drive["tunnels"]:
            on_route.add(key(t["start"]))
            on_route.add(key(t["end"]))
    route_pts = [p for d in drives for s in d["segments"] for p in s["coords"][::4]]
    tunnel_grid = {}
    for d in drives:
        for seg in d["segments"]:
            if seg["kind"] == "open":
                continue
            for p in seg["coords"]:
                tunnel_grid.setdefault((int(p[0] / 0.01), int(p[1] / 0.01)), []).append(p)

    def along_route_tunnel(coords):
        """Most of it within 150 m of one of our route's tunnels: the other
        carriageway or bore of a tunnel we already show."""
        hits = 0
        for p in coords:
            ci, cj = int(p[0] / 0.01), int(p[1] / 0.01)
            if any(
                haversine_m(p, q) < 150
                for di in (-1, 0, 1) for dj in (-1, 0, 1) for q in tunnel_grid.get((ci + di, cj + dj), [])
            ):
                hits += 1
        return hits >= len(coords) * 0.5
    cell = 0.1
    grid = {}
    for p in route_pts:
        grid.setdefault((int(p[0] / cell), int(p[1] / cell)), []).append(p)

    def near_route(p):
        ci, cj = int(p[0] / cell), int(p[1] / cell)
        for di in (-2, -1, 0, 1, 2):
            for dj in (-2, -1, 0, 1, 2):
                for q in grid.get((ci + di, cj + dj), []):
                    if haversine_m(p, q) <= NEARBY_KM * 1000:
                        return True
        return False

    # Join tunnel pieces of the same road that touch (a tunnel is often
    # several OSM ways), then keep the long ones.
    pieces = []
    for i, road in enumerate(roads):
        run = None
        for a, b, kind, name in zip(road["coords"], road["coords"][1:], road["kinds"], road["names"]):
            if kind == "tunnel":
                if run is None:
                    run = {"coords": [a], "road": i, "name": name}
                run["coords"].append(b)
            elif run is not None:
                pieces.append(run)
                run = None
        if run is not None:
            pieces.append(run)
    by_end = {}
    for idx, p in enumerate(pieces):
        by_end.setdefault(key(p["coords"][0]), []).append(idx)
    used = set()
    chains = []
    for idx, p in enumerate(pieces):
        if idx in used:
            continue
        used.add(idx)
        coords = list(p["coords"])
        names = [p["name"]]
        cls = roads[p["road"]]["cls"]
        sub = roads[p["road"]]["sub"]
        road_name = roads[p["road"]]["name"]
        while True:
            nxt = [j for j in by_end.get(key(coords[-1]), []) if j not in used]
            if not nxt:
                break
            j = nxt[0]
            used.add(j)
            coords.extend(pieces[j]["coords"][1:])
            names.append(pieces[j]["name"])
        chains.append((coords, names, cls, sub, road_name))

    out = []
    seen = []
    for coords, names, cls, sub, road_name in chains:
        length = sum(haversine_m(a, b) for a, b in zip(coords, coords[1:]))
        if length < NEARBY_MIN_M:
            continue
        if key(coords[0]) in on_route or key(coords[-1]) in on_route or along_route_tunnel(coords):
            continue
        mid = midpoint(coords)
        if not near_route(mid):
            continue
        # The other carriageway of a dual tunnel: keep one of the two.
        if any(haversine_m(mid, m) < 120 and abs(length - l) < 0.15 * length for m, l in seen):
            continue
        seen.append((mid, length))
        known = known_for(length, mid)
        item = {
            "lengthM": int(round(length, -1)),
            "speedKmh": speed_of(cls, sub),
            "coords": simplify(coords),
            "road": road_name or None,
        }
        name_ja = known[1] if known else next((n for n in names if n), None) or hot_name(hot, coords, length)
        # Twin bores share a name: one is enough on the map.
        if name_ja and any(t.get("nameJa") == name_ja for t in out):
            continue
        if known:
            item["name"] = known[0]
            if known[2]:
                item["note"] = known[2]
        if name_ja:
            item["nameJa"] = name_ja
        out.append(item)
    out.sort(key=lambda t: -t["lengthM"])
    return out


def load_hot_names(path):
    """Named tunnel ways (name ending in トンネル etc.) from a HOT OSM roads
    export (GeoPackage), inside the drive area: [(name, coords, length)].
    That export has no tunnel tag, but in Japan a tunnel way is named after
    the tunnel, which is what fills the names Overture dropped."""
    if not path:
        return []
    import sqlite3

    con = sqlite3.connect(path)
    table = con.execute("select table_name from gpkg_contents where data_type='features'").fetchone()[0]
    geom = con.execute("select column_name from gpkg_geometry_columns where table_name=?", (table,)).fetchone()[0]
    lon0, lat0, lon1, lat1 = 136.45, 35.05, 138.25, 36.75
    rows = con.execute(
        f'select name, "{geom}" from "{table}" '
        "where name like '%トンネル%' or name like '%隧道%' or name like '%覆道%'"
    ).fetchall()
    out = []
    for name, blob in rows:
        flags = blob[3]
        envelope = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[(flags >> 1) & 0x07]
        g = wkb.loads(bytes(blob[8 + envelope:]))
        lines = list(g.geoms) if g.geom_type == "MultiLineString" else [g]
        for line in lines:
            coords = [(lat, lon) for lon, lat in line.coords]
            if not any(lat0 <= lat <= lat1 and lon0 <= lon <= lon1 for lat, lon in coords[:1]):
                continue
            length = sum(haversine_m(a, b) for a, b in zip(coords, coords[1:]))
            out.append((clean_tunnel_name(name), coords, length))
    print(f"{len(out)} named tunnel ways in the HOT export")
    return out


def hot_name(hot, coords, length_m):
    """Name of the HOT tunnel way lying along this tunnel, if one does."""
    if not hot:
        return None
    mid = midpoint(coords)
    best, best_score = None, math.inf
    for name, hc, hl in hot:
        hm = midpoint(hc)
        if abs(hm[0] - mid[0]) > 0.05 or abs(hm[1] - mid[1]) > 0.06:
            continue
        # Both ends of the HOT way close to our tunnel line.
        ends = [min(haversine_m(e, p) for p in coords) for e in (hc[0], hc[-1], hm)]
        if max(ends) > 80:
            continue
        overlap = hl / max(length_m, 1)
        if overlap < 0.3:
            continue
        score = max(ends) + abs(1 - min(overlap, 1)) * 100
        if score < best_score:
            best, best_score = name, score
    return best


def main():
    roads = load_roads(sys.argv[1] if len(sys.argv) > 1 else "alps_roads.parquet")
    hot = load_hot_names(sys.argv[2] if len(sys.argv) > 2 else None)
    print(f"{len(roads)} road segments")
    graph = build_graph(roads)
    drives = []
    for frm, to in DRIVES:
        start, ds = nearest_node(graph, roads, HOTELS[frm][1:])
        goal, dg = nearest_node(graph, roads, HOTELS[to][1:])
        path, seconds = shortest(graph, start, goal)
        drive = build_drive(frm, to, path, roads, hot)
        drive["minutes"] = round(seconds / 60)
        drives.append(drive)
        real = [t for t in drive["tunnels"] if t["kind"] == "tunnel"]
        print(
            f"{drive['id']}: {drive['lengthKm']} km (~{drive['minutes']} min, {drive['motorwayKm']} km expressway), "
            f"{len(real)} tunnels {sum(t['lengthM'] for t in real) / 1000:.1f} km, snap {ds:.0f}/{dg:.0f} m"
        )
        for t in real:
            if t["lengthM"] >= 1000:
                print(f"    {t['startKm']:6.1f} km  {t['lengthM']:6d} m  {t.get('nameJa') or '-'}  {t.get('name') or ''}  [{t['road']}]")
    nearby = nearby_tunnels(roads, drives, hot)
    print(f"{len(nearby)} other tunnels nearby")
    OUT.write_text(json.dumps({"drives": drives, "nearby": nearby}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
