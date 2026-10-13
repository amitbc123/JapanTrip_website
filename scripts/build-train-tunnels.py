#!/usr/bin/env python3
"""One-time script: builds src/data/train-tunnels.json, the exact track
geometry of each of our train rides with every tunnel along it, for the
map's "tunnel view" (made for Omri).

Source: Overture Maps transportation segments (rail subtype), which carry
OpenStreetMap's track geometry with explicit `is_tunnel` / `is_covered`
ranges (ODbL). The input is a local extract of Japan's rail segments, made
by range-reading the release's GeoParquet files on S3 (see
scripts/extract-overture-rail.py).

For each ride, the route is the shortest path over the track network
restricted to that ride's lines, between the two stations. Consecutive
tunnel track is one tunnel; runs shorter than MIN_TUNNEL_M are dropped
(road underpasses and the like).

Usage: python3 scripts/build-train-tunnels.py japan_rail.parquet
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
OUT = ROOT / "src" / "data" / "train-tunnels.json"

MIN_TUNNEL_M = 100
MIN_COVERED_M = 100
SEAM_M = 25
# Douglas-Peucker tolerance for the stored open-air track (degrees, ~15 m).
SIMPLIFY_DEG = 0.00015

# Each ride: label (matches route-public.json trains[].label), the station
# endpoints as [lat, lon], the OSM line names its tracks carry, and a
# typical running speed (km/h) used to estimate time inside tunnels when
# the schedule doesn't give one.
RIDES = [
    {
        "id": "train-1",
        "label": "Train 1",
        "from": ("浅草", 35.71084, 139.79782),
        "to": ("東武日光", 36.74787, 139.61946),
        "lines": ["東武伊勢崎線", "東武日光線", "東武スカイツリーライン"],
        "speed": 85,
    },
    {
        "id": "nikko-local",
        "label": None,
        "from": ("日光", 36.74718, 139.62194),
        "to": ("宇都宮", 36.55916, 139.89851),
        "lines": ["JR日光線"],
        "speed": 70,
    },
    {
        "id": "train-2",
        "label": "Train 2",
        "from": ("宇都宮", 36.55930, 139.89816),
        "to": ("大石田", 38.59563, 140.37531),
        "lines": ["東北新幹線", "山形新幹線", "奥羽"],
        "speed": None,
    },
    {
        "id": "train-3",
        "label": "Train 3",
        "from": ("大石田", 38.59563, 140.37531),
        "to": ("東京", 35.68114, 139.76745),
        "lines": ["東北新幹線", "山形新幹線", "奥羽"],
        "speed": None,
    },
    {
        "id": "train-4",
        "label": "Train 4",
        "from": ("小田原", 35.25618, 139.15525),
        "to": ("東京", 35.68114, 139.76745),
        "lines": ["東海道新幹線"],
        "speed": None,
    },
    {
        "id": "train-5",
        "label": "Train 5",
        "from": ("東京", 35.68114, 139.76745),
        "to": ("金沢", 36.57805, 136.64802),
        "lines": ["東北新幹線", "上越新幹線", "北陸新幹線"],
        "speed": None,
    },
    {
        "id": "train-6",
        "label": "Train 6",
        "from": ("名古屋", 35.17073, 136.88184),
        "to": ("京都", 34.98535, 135.75877),
        "lines": ["東海道新幹線"],
        "speed": None,
    },
    {
        "id": "train-7",
        "label": "Train 7",
        "from": ("新大阪", 34.73354, 135.50019),
        "to": ("広島", 34.39739, 132.47584),
        "lines": ["山陽新幹線"],
        "speed": 230,
    },
    {
        "id": "train-8",
        "label": "Train 8",
        "from": ("広島", 34.39739, 132.47584),
        "to": ("熊本", 32.79041, 130.68862),
        "lines": ["山陽新幹線", "九州新幹線", "博多南線"],
        "speed": 230,
    },
    {
        "id": "train-9",
        "label": "Train 9",
        "from": ("池袋", 35.73023, 139.71148),
        "to": ("西武秩父", 35.99021, 139.08312),
        "lines": ["西武池袋線", "西武秩父線"],
        "speed": 65,
    },
    {
        "id": "train-11",
        "label": "Train 11",
        "from": ("新宿", 35.69026, 139.70051),
        "to": ("成田空港", 35.76540, 140.38599),
        "lines": ["山手", "横須賀", "総武", "成田線", "成田エクスプレス", "埼京", "湘南新宿"],
        "speed": 75,
    },
]


# Typical running speed (km/h) through tunnels on each line, used to
# estimate the time spent inside. Approximate by design: trains run near
# line speed in long tunnels, slower near stations.
LINE_SPEEDS = [
    ("東北新幹線", 260),
    ("上越新幹線", 240),
    ("北陸新幹線", 240),
    ("東海道新幹線", 230),
    ("山陽新幹線", 260),
    ("九州新幹線", 240),
    ("奥羽", 110),
    ("山形新幹線", 110),
    ("東武", 90),
    ("西武秩父線", 70),
    ("西武", 80),
    ("総武", 90),
    ("横須賀", 90),
    ("成田", 90),
]
# The Itaya Pass (Fukushima–Yonezawa) is steep and slow.
ITAYA_PASS = (37.76, 140.15, 37.86, 140.42)
ITAYA_SPEED = 80


# Trains crawl through central Tokyo (Tokyo-Ueno, the Sobu tunnel).
TOKYO_STATION = (35.6812, 139.7671)
TOKYO_SLOW_KM = 8
TOKYO_SPEED = 90


def point_at_half(coords):
    total = sum(haversine_m(a, b) for a, b in zip(coords, coords[1:]))
    walked = 0.0
    for a, b in zip(coords, coords[1:]):
        d = haversine_m(a, b)
        if walked + d >= total / 2 and d > 0:
            f = (total / 2 - walked) / d
            return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
        walked += d
    return coords[-1]


def speed_for(line, point, ride):
    lat, lon = point
    if haversine_m(point, TOKYO_STATION) < TOKYO_SLOW_KM * 1000:
        return TOKYO_SPEED
    if ITAYA_PASS[0] <= lat <= ITAYA_PASS[2] and ITAYA_PASS[1] <= lon <= ITAYA_PASS[3] and "新幹線" not in line.replace("山形新幹線", ""):
        return ITAYA_SPEED
    for needle, speed in LINE_SPEEDS:
        if needle in line:
            return speed
    return ride.get("speed") or 90


# Named tunnels: (hebrew, japanese, official length m, approx. midpoint).
# A tunnel found along a route gets the name only when its midpoint is
# within NAME_MATCH_KM of this point and its length is within
# NAME_MATCH_RATIO of the official one, so a name is never guessed.
KNOWN_TUNNELS = [
    ("מנהרת נאסו", "那須トンネル", 7030, (37.059, 140.131)),
    ("מנהרת פוקושימה", "福島トンネル", 11705, (37.652, 140.462)),
    ("מנהרת אקימה", "秋間トンネル", 8295, (36.380, 138.797)),
    ("מנהרת איצ'ינוסה", "一ノ瀬トンネル", 6165, (36.393, 138.724)),
    ("מנהרת מעבר אוסוי", "碓氷峠トンネル", 6092, (36.367, 138.670)),
    ("מנהרת גוריגאמינה", "五里ヶ峯トンネル", 15175, (36.467, 138.184)),
    ("מנהרת טקאוקה", "高丘トンネル", 6914, (36.747, 138.324)),
    ("מנהרת אייאמה", "飯山トンネル", 22251, (36.940, 138.327)),
    ("מנהרת שין-אויאשיראזו", "新親不知トンネル", 7336, (36.989, 137.701)),
    ("מנהרת אסאהי", "朝日トンネル", 7570, (36.960, 137.624)),
    ("מנהרת רוקו", "六甲トンネル", 16250, (34.735, 135.274)),
    ("מנהרת קובה", "神戸トンネル", 7970, (34.696, 135.149)),
    ("מנהרת הוסאקה", "帆坂トンネル", 7588, (34.770, 134.296)),
    ("מנהרת בינגו", "備後トンネル", 8900, (34.414, 133.138)),
    ("מנהרת אקי", "安芸トンネル", 13030, (34.364, 132.623)),
    ("מנהרת שין-קאנמון (מתחת לים)", "新関門トンネル", 18713, (33.933, 130.970)),
    ("מנהרת קיטאקיושו", "北九州トンネル", 11747, (33.857, 130.811)),
    ("מנהרת פוקואוקה", "福岡トンネル", 8488, (33.691, 130.546)),
    ("מנהרת צ'יקושי", "筑紫トンネル", 11950, (33.431, 130.466)),
    ("מנהרת שומארו", "正丸トンネル", 4811, (35.957, 139.163)),
    ("קטע תת-קרקעי טוקיו-אואנו", "東北新幹線 東京～上野 地下区間", 3700, (35.715, 139.772)),
    ("מנהרת סובו (שינאגאווה-טוקיו-קינשיצ'ו)", "総武トンネル", 9500, (35.665, 139.768)),
    ("מנהרת הגישה לשדה התעופה נריטה", "成田空港トンネル", 1900, (35.773, 140.384)),
]
NAME_MATCH_KM = 4.0
NAME_MATCH_RATIO = 0.08


def name_for(length_m, point):
    for he, ja, official, (lat, lon) in KNOWN_TUNNELS:
        if haversine_m(point, (lat, lon)) <= NAME_MATCH_KM * 1000 and abs(length_m - official) <= official * NAME_MATCH_RATIO:
            return he, ja
    return None


def haversine_m(a, b):
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def key(lat, lon):
    return (round(lat, 7), round(lon, 7))


def _flag_ranges(flags, name):
    out = []
    for f in flags or []:
        if name in (f["values"] or []):
            a, b = f["between"] or (0.0, 1.0)
            out.append((a, b))
    return out


def load_tracks(parquet_path):
    """Rail segments as point lists with a per-edge kind: "open", "tunnel"
    or "covered" (snow sheds and other roofed track). Overture marks
    tunnels as a fraction range along the segment, so each segment is split
    exactly at those boundaries."""
    rows = pq.read_table(parquet_path, columns=["id", "names", "class", "rail_flags", "geometry"]).to_pylist()
    tracks = []
    for r in rows:
        flags = r["rail_flags"]
        if any(v in ("is_abandoned", "is_disused", "is_under_construction") and f["between"] is None
               for f in flags or [] for v in f["values"]):
            continue
        g = wkb.loads(r["geometry"])
        if g.geom_type != "LineString" or len(g.coords) < 2:
            continue
        tunnels = _flag_ranges(flags, "is_tunnel")
        covered = _flag_ranges(flags, "is_covered")
        cuts = sorted({0.0, 1.0, *[x for rng in tunnels + covered for x in rng]})
        name = ((r["names"] or {}).get("primary")) or ""
        coords = []
        kinds = []
        for a, b in zip(cuts, cuts[1:]):
            if b - a <= 0:
                continue
            piece = substring(g, a, b, normalized=True)
            pts = [(lat, lon) for lon, lat in piece.coords]
            mid = (a + b) / 2
            kind = (
                "tunnel" if any(x <= mid <= y for x, y in tunnels)
                else "covered" if any(x <= mid <= y for x, y in covered)
                else "open"
            )
            if coords:
                pts = pts[1:]
            for p in pts:
                if coords:
                    kinds.append(kind)
                coords.append(p)
        if len(coords) >= 2:
            tracks.append({"id": r["id"], "name": name, "coords": coords, "kinds": kinds})
    return tracks


OTHER_TRACK_PENALTY = 6.0
# Straight-line bridges over gaps cost more than any real track, so real
# (even unnamed) track always wins where it exists.
GAP_PENALTY = 12.0
BRIDGES = set()
GAP_BRIDGE_M = 8000


def near_route(track, ride):
    """Cheap corridor filter: within the ride's bounding box (+~10 km)."""
    lats = (ride["from"][1], ride["to"][1])
    lons = (ride["from"][2], ride["to"][2])
    lat, lon = track["coords"][0]
    return min(lats) - 0.1 <= lat <= max(lats) + 0.1 and min(lons) - 0.12 <= lon <= max(lons) + 0.12


def route(tracks, ride):
    graph = {}

    def add_edge(ka, kb, d, kind, line=""):
        graph.setdefault(ka, []).append((kb, d, kind, line))
        graph.setdefault(kb, []).append((ka, d, kind, line))

    # Tracks of the ride's own lines cost their length; any other track
    # (platform tracks named after the station, unnamed connectors such as
    # the Yamagata Shinkansen's link onto the Tohoku Shinkansen) can be used
    # but costs OTHER_TRACK_PENALTY times more, so the path only takes it to
    # bridge a short gap, never as a detour.
    degree = {}
    for t in tracks:
        own = bool(t["name"]) and any(n in t["name"] for n in ride["lines"])
        if not own and not near_route(t, ride):
            continue
        factor = 1.0 if own else OTHER_TRACK_PENALTY
        for a, b, kind in zip(t["coords"], t["coords"][1:], t["kinds"]):
            ka, kb = key(*a), key(*b)
            d = haversine_m(a, b)
            add_edge(ka, kb, d * factor, kind, t["name"])
            if own:
                degree[ka] = degree.get(ka, 0) + 1
                degree[kb] = degree.get(kb, 0) + 1

    # Bridge gaps in the export (a few track pieces are missing): join each
    # pair of separate pieces of the ride's own lines at their closest
    # points, when those are within GAP_BRIDGE_M.
    own_adj = {}
    for k in degree:
        own_adj[k] = [n for n, *_ in graph[k] if n in degree]
    comp = {}
    for k in own_adj:
        if k in comp:
            continue
        comp[k] = k
        stack = [k]
        while stack:
            x = stack.pop()
            for y in own_adj[x]:
                if y not in comp:
                    comp[y] = k
                    stack.append(y)
    cell = 0.05
    buckets = {}
    for k in own_adj:
        buckets.setdefault((int(k[0] / cell), int(k[1] / cell)), []).append(k)
    best = {}
    for k in own_adj:
        ci, cj = int(k[0] / cell), int(k[1] / cell)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for other in buckets.get((ci + di, cj + dj), []):
                    if comp[other] == comp[k]:
                        continue
                    d = haversine_m(k, other)
                    pair = tuple(sorted((comp[k], comp[other])))
                    if d < GAP_BRIDGE_M and d < best.get(pair, (math.inf,))[0]:
                        best[pair] = (d, k, other)
    for d, a, b in best.values():
        add_edge(a, b, d * GAP_PENALTY, "open")
        BRIDGES.add((a, b))
        BRIDGES.add((b, a))

    def nearest(lat, lon):
        return min(degree, key=lambda k: haversine_m(k, (lat, lon)))

    start = nearest(ride["from"][1], ride["from"][2])
    goal = nearest(ride["to"][1], ride["to"][2])
    dist = {start: 0.0}
    prev = {}
    heap = [(0.0, start)]
    while heap:
        d, node = heapq.heappop(heap)
        if node == goal:
            break
        if d > dist.get(node, math.inf):
            continue
        for nxt, w, kind, line in graph[node]:
            nd = d + w
            if nd < dist.get(nxt, math.inf):
                dist[nxt] = nd
                prev[nxt] = (node, kind, line)
                heapq.heappush(heap, (nd, nxt))
    if goal not in prev:
        raise SystemExit(f"no path for {ride['id']}")

    # Walk back into a list of (point, below-ground flag of the segment
    # that leads to it).
    path = []
    node = goal
    while node != start:
        p, kind, line = prev[node]
        path.append((node, kind, line))
        node = p
    path.append((start, "open", ""))
    path.reverse()
    return path


def build(ride, path):
    # Split into runs of the same kind (open / tunnel / covered).
    runs = []
    pos_m = 0.0
    for i in range(1, len(path)):
        a, b = path[i - 1][0], path[i][0]
        kind = path[i][1]
        line = path[i][2]
        d = haversine_m(a, b)
        if runs and runs[-1]["kind"] == kind:
            runs[-1]["coords"].append(b)
            runs[-1]["length"] += d
            runs[-1]["lines"][line] = runs[-1]["lines"].get(line, 0) + d
        else:
            runs.append({"kind": kind, "coords": [a, b], "length": d, "start_m": pos_m, "lines": {line: d}})
        pos_m += d
    total_m = pos_m
    for i in range(1, len(path)):
        if (path[i - 1][0], path[i][0]) in BRIDGES:
            gap = haversine_m(path[i - 1][0], path[i][0])
            print(f"  {ride['id']}: bridged a {gap:.0f} m gap in the export at {path[i - 1][0]}")

    # A data seam of a few metres between two tunnel pieces is one tunnel.
    for i in range(1, len(runs) - 1):
        r = runs[i]
        if r["kind"] != "tunnel" and r["length"] < SEAM_M and runs[i - 1]["kind"] == runs[i + 1]["kind"] == "tunnel":
            r["kind"] = "tunnel"

    # Very short tunnels / roofed bits (road underpasses and the like) count
    # as open track; then merge neighbours of the same kind.
    merged = []
    for run in runs:
        kind = run["kind"]
        if kind == "tunnel" and run["length"] < MIN_TUNNEL_M:
            kind = "open"
        if kind == "covered" and run["length"] < MIN_COVERED_M:
            kind = "open"
        if merged and merged[-1]["kind"] == kind:
            merged[-1]["coords"].extend(run["coords"][1:])
            merged[-1]["length"] += run["length"]
            for line, d in run["lines"].items():
                merged[-1]["lines"][line] = merged[-1]["lines"].get(line, 0) + d
        else:
            merged.append({**run, "kind": kind, "coords": list(run["coords"]), "lines": dict(run["lines"])})

    segments = []
    tunnels = []
    for run in merged:
        coords = run["coords"]
        line = LineString([(lon, lat) for lat, lon in coords]).simplify(SIMPLIFY_DEG)
        rounded = [[round(lat, 5), round(lon, 5)] for lon, lat in line.coords]
        segments.append({"kind": run["kind"], "coords": rounded})
        if run["kind"] != "open":
            line = max(run["lines"], key=run["lines"].get)
            mid = point_at_half(coords)
            speed = speed_for(line, mid, ride)
            tunnel = {
                "kind": run["kind"],
                "lengthM": round(run["length"]),
                "startKm": round(run["start_m"] / 1000, 1),
                "speedKmh": speed,
                "start": rounded[0],
                "end": rounded[-1],
            }
            known = name_for(run["length"], mid)
            if known:
                tunnel["name"], tunnel["nameJa"] = known
            tunnels.append(tunnel)
    return {
        "id": ride["id"],
        "label": ride["label"],
        "from": ride["from"][0],
        "to": ride["to"][0],
        "lengthKm": round(total_m / 1000, 1),
        "segments": segments,
        "tunnels": tunnels,
    }


def main():
    tracks = load_tracks(sys.argv[1])
    out = []
    for ride in RIDES:
        result = build(ride, route(tracks, ride))
        tun_km = sum(t["lengthM"] for t in result["tunnels"] if t["kind"] == "tunnel") / 1000
        print(
            f"{ride['id']:12} {result['lengthKm']:7.1f} km, {sum(t['kind'] == 'tunnel' for t in result['tunnels']):3} tunnels, "
            f"{tun_km:6.1f} km underground, longest "
            f"{max((t['lengthM'] for t in result['tunnels']), default=0)} m"
        )
        out.append(result)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
