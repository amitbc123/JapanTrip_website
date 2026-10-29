#!/usr/bin/env python3
"""One-time script: extracts the main road segments of the central Japan
Alps (our rental-car area) from an Overture Maps release into a small local
GeoParquet (input for build-road-tunnels.py).

The release's transportation/segment files hold the whole world (~70 GB),
so this reads them with HTTP range requests: first only the footers, then
only the row groups whose bounding box touches the area, keeping road rows
of the classes a car trip uses.

Usage: python3 scripts/extract-overture-roads.py [release] [output.parquet]
       (defaults: 2026-10-21.0, alps_roads.parquet)
Needs: pip install pyarrow
"""

import concurrent.futures as cf
import io
import re
import sys
import urllib.request

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

BASE = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/"
RELEASE = sys.argv[1] if len(sys.argv) > 1 else "2026-10-21.0"
OUTPUT = sys.argv[2] if len(sys.argv) > 2 else "alps_roads.parquet"
# lon/lat box covering Car 2 (Kanazawa - Shirakawa-go - Takayama - Okuhida -
# Matsumoto - Ina valley - Kiso valley - Nagoya).
BOX = (136.45, 35.05, 138.25, 36.75)
CLASSES = ["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential"]
COLUMNS = ["id", "names", "subtype", "class", "subclass", "road_flags", "geometry", "bbox"]


class HttpRangeFile(io.RawIOBase):
    """Seekable read-only file over HTTP range requests."""

    def __init__(self, url, size):
        self.url, self.size, self.pos = url, size, 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        if n == 0 or self.pos >= self.size:
            return b""
        end = min(self.pos + n, self.size) - 1
        request = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{end}"})
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(request, timeout=120).read()
                break
            except OSError:
                if attempt == 3:
                    raise
        self.pos += len(data)
        return data

    def readinto(self, buffer):
        data = self.read(len(buffer))
        buffer[: len(data)] = data
        return len(data)


def list_files():
    prefix = f"release/{RELEASE}/theme=transportation/type=segment/"
    xml = urllib.request.urlopen(f"{BASE}?prefix={prefix}&max-keys=1000", timeout=60).read().decode()
    keys = re.findall(r"<Key>([^<]*)</Key>", xml)
    sizes = [int(x) for x in re.findall(r"<Size>([^<]*)</Size>", xml)]
    return list(zip(keys, sizes))


def row_groups_in_box(key_size):
    key, size = key_size
    metadata = pq.ParquetFile(HttpRangeFile(BASE + key, size)).metadata
    first = metadata.row_group(0)
    index = {first.column(i).path_in_schema: i for i in range(first.num_columns)}
    hits = []
    for r in range(metadata.num_row_groups):
        rg = metadata.row_group(r)
        stat = lambda name: rg.column(index[name]).statistics  # noqa: E731
        if (
            stat("bbox.xmax").max < BOX[0]
            or stat("bbox.xmin").min > BOX[2]
            or stat("bbox.ymax").max < BOX[1]
            or stat("bbox.ymin").min > BOX[3]
        ):
            continue
        hits.append((key, size, r))
    return hits


def read_roads(job):
    key, size, r = job
    pf = pq.ParquetFile(HttpRangeFile(BASE + key, size))
    if not pc.any(pc.equal(pf.read_row_group(r, columns=["subtype"]).column(0), "road")).as_py():
        return None
    table = pf.read_row_group(r, columns=COLUMNS)
    table = table.filter(pc.and_(pc.equal(table["subtype"], "road"), pc.is_in(table["class"], pa.array(CLASSES))))
    bbox = table["bbox"]
    inside = pc.and_(
        pc.and_(
            pc.greater_equal(pc.struct_field(bbox, "xmax"), BOX[0]),
            pc.less_equal(pc.struct_field(bbox, "xmin"), BOX[2]),
        ),
        pc.and_(
            pc.greater_equal(pc.struct_field(bbox, "ymax"), BOX[1]),
            pc.less_equal(pc.struct_field(bbox, "ymin"), BOX[3]),
        ),
    )
    table = table.filter(inside)
    return table if table.num_rows else None


def main():
    with cf.ThreadPoolExecutor(16) as pool:
        jobs = [hit for hits in pool.map(row_groups_in_box, list_files()) for hit in hits]
    print(f"{len(jobs)} row groups touch the box")
    with cf.ThreadPoolExecutor(24) as pool:
        tables = [t for t in pool.map(read_roads, jobs) if t is not None]
    table = pa.concat_tables(tables)
    pq.write_table(table, OUTPUT)
    print(f"wrote {OUTPUT}: {table.num_rows} road segments")


if __name__ == "__main__":
    main()
