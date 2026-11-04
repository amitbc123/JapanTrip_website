import { AREAS, PLACE_BY_ID, REGIONS, STATIONS, TRIP_END, cityEn } from "@/treasure/data"
import type { Base, LatLon, Origin, Place, Region, Station } from "@/treasure/types"

/* ---------------- Japan time ---------------- */

export const TZ = "Asia/Tokyo"

export interface JapanNow {
  /** "YYYY-MM-DD" */
  date: string
  h: number
  m: number
  /** "HH:mm" */
  hm: string
  /** ms epoch of this reading. */
  ms: number
}

export function japanNow(at = new Date()): JapanNow {
  const parts: Record<string, string> = {}
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(at)
    .forEach((x) => (parts[x.type] = x.value))
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    h: Number(parts.hour),
    m: Number(parts.minute),
    hm: `${parts.hour}:${parts.minute}`,
    ms: at.getTime(),
  }
}

export function addDays(date: string, n: number): string {
  const t = new Date(`${date}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

function fmtDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", ...options }).format(new Date(`${date}T00:00:00Z`))
}
export const dateShort = (d: string) => fmtDate(d, { day: "numeric", month: "numeric" })
export const dateLong = (d: string) => fmtDate(d, { weekday: "long", day: "numeric", month: "long" })

/* ---------------- Distance and time (calibrated, keep as is) ---------------- */

export function km(a: LatLon, b: LatLon): number {
  const r = Math.PI / 180
  const x = (b.lat - a.lat) * r
  const y = (b.lon - a.lon) * r
  const s = Math.sin(x / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(y / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(s))
}

/** Straight-line km × 1.25 detour, at 4.8 km/h. */
export function walkMin(k: number): number {
  return Math.round(((k * 1.25) / 4.8) * 60)
}

/** Up to 25 km: 8 min + km × 1.35 at 20 km/h; farther: 15 min + km at 50 km/h. */
export function transitMin(k: number): number {
  return k <= 25 ? Math.round(8 + ((k * 1.35) / 20) * 60) : Math.round(15 + (k / 50) * 60)
}

export function fmtMin(m: number): string {
  if (m < 60) return `${m} דק׳`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}:${String(r).padStart(2, "0")} ש׳` : `${h} ש׳`
}

export function fmtKm(k: number): string {
  if (k < 1) return `${Math.round((k * 1000) / 10) * 10} מ׳`
  return `${k < 10 ? k.toFixed(1) : Math.round(k)} ק״מ`
}

export function priceText(v: Place["price"]): string {
  if (v === null) return ""
  return v === 0 ? "חינם" : "¥".repeat(v)
}

/* ---------------- Regions, hotels, origin ---------------- */

const FIRST = REGIONS[0]!
const LAST = REGIONS[REGIONS.length - 1]!

/** The region of a Japan date, clamped to the first/last region outside the trip. */
export function regionForDate(date: string): Region {
  return REGIONS.find((r) => date >= r.from && date < r.to) ?? (date >= TRIP_END ? LAST : FIRST)
}

export function baseForDate(region: Region, date: string): Base {
  return region.bases.find((b) => date >= b.from && date < b.to) ?? (date < region.from ? region.bases[0]! : region.bases[region.bases.length - 1]!)
}

/** Region whose hotel is within 90 km of this point (else null: use the date). */
export function regionNear(p: LatLon): Region | null {
  let best: Region | null = null
  let bestKm = Infinity
  for (const r of REGIONS) {
    for (const b of r.bases) {
      const d = km(p, b)
      if (d < bestKm) {
        bestKm = d
        best = r
      }
    }
  }
  return bestKm < 90 ? best : null
}

/** Live or manual location counts as "inside" a region within 60 km of one of its hotels. */
export function insideRegion(p: LatLon, region: Region): boolean {
  return region.bases.some((b) => km(p, b) < 60)
}

export function originFor(region: Region, base: Base, me: (LatLon & { manual: boolean; label?: string }) | null): Origin {
  if (me && insideRegion(me, region)) {
    return { lat: me.lat, lon: me.lon, label: me.manual ? (me.label ?? "הנקודה שבחרתם") : "המיקום שלך", me: true, manual: me.manual }
  }
  return { lat: base.lat, lon: base.lon, label: base.name, me: false, manual: false }
}

/** Trip days from today (or the first treasure-map day) to the end. */
export function tripDates(today: string): string[] {
  const out: string[] = []
  for (let d = today < FIRST.from ? FIRST.from : today; d <= TRIP_END; d = addDays(d, 1)) out.push(d)
  return out
}

/* ---------------- How to get there (ported from howTo()) ---------------- */

export type HowStep =
  | { kind: "walk-only"; minutes: number; km: number }
  | { kind: "trip"; text: string }
  | { kind: "walk-to-station"; minutes: number; station: string }
  | { kind: "ride"; direct: boolean; lines: string[]; fromLines: string[]; toLines: string[]; station: string }
  | { kind: "walk-from-station"; minutes: number }
  | { kind: "bus-from-station"; km: number }
  | { kind: "one-station"; minutes: number; station: string }
  | { kind: "no-station"; minutes: number }

interface StationHit {
  s: Station
  d: number
}

function nearestStation(p: LatLon): StationHit | null {
  let best: StationHit | null = null
  for (const s of STATIONS) {
    const d = km(p, s)
    if (!best || d < best.d) best = { s, d }
  }
  return best
}

function candidates(p: LatLon): StationHit[] {
  const all = STATIONS.map((s) => ({ s, d: km(p, s) })).sort((a, b) => a.d - b.d)
  const limit = Math.max(1.2, (all[0]?.d ?? 0) + 0.5)
  return all.filter((x) => x.d <= limit).slice(0, 6)
}

export function howTo(p: Place, o: LatLon): HowStep[] {
  const d = km(o, p)
  const area = AREAS[p.area]
  const steps: HowStep[] = []
  if (d <= 1.5) return [{ kind: "walk-only", minutes: walkMin(d), km: d }]

  let a: StationHit | null = null
  let b: StationHit | null = null
  let best = Infinity
  for (const x of candidates(o)) {
    for (const y of candidates(p)) {
      if (x.s === y.s) continue
      const shared = x.s.lines.some((l) => y.s.lines.includes(l))
      const score = walkMin(x.d) + walkMin(y.d) + (shared ? 0 : 12)
      if (score < best) {
        best = score
        a = x
        b = y
      }
    }
  }
  if (!a || !b) {
    a = nearestStation(o)
    b = nearestStation(p)
  }
  if (area?.trip && d > 20) steps.push({ kind: "trip", text: area.trip })
  if (a && b && a.d < 3 && b.d < 6 && a.s !== b.s) {
    const common = a.s.lines.filter((l) => b.s.lines.includes(l))
    steps.push({ kind: "walk-to-station", minutes: walkMin(a.d), station: a.s.name })
    steps.push({
      kind: "ride",
      direct: common.length > 0,
      lines: common.slice(0, 2),
      fromLines: a.s.lines.slice(0, 2),
      toLines: b.s.lines.slice(0, 2),
      station: b.s.name,
    })
    steps.push(b.d <= 1.6 ? { kind: "walk-from-station", minutes: walkMin(b.d) } : { kind: "bus-from-station", km: b.d })
  } else if (a && b && a.s === b.s && b.d <= 1.6) {
    steps.push({ kind: "one-station", minutes: walkMin(d), station: a.s.name })
  } else if (!area?.trip) {
    steps.push({ kind: "no-station", minutes: transitMin(d) })
  }
  return steps
}

/* ---------------- Google links ---------------- */

const enc = encodeURIComponent

export const mapsUrl = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${enc(`${p.en}, ${cityEn(p)}`)}`
export const imagesUrl = (p: Place) => `https://www.google.com/search?tbm=isch&q=${enc(`${p.en} ${cityEn(p)}`)}`
export const directionsUrl = (p: Place, o: LatLon, distanceKm: number) =>
  `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lon}&destination=${enc(`${p.en}, ${cityEn(p)}`)}&travelmode=${distanceKm <= 2.2 ? "walking" : "transit"}`
/** Google Maps search around a point (online "what's near me"). */
export const searchAroundUrl = (query: string, at: LatLon) =>
  `https://www.google.com/maps/search/${enc(query)}/@${at.lat.toFixed(5)},${at.lon.toFixed(5)},16z`

export interface RouteLink {
  from: number
  to: number
  url: string
}

/** Google Maps on mobile takes at most 3 waypoints per link, so a day is a
 *  chain of links of up to 4 stops, each starting where the last ended. */
export function routeLinks(o: LatLon, stops: Place[]): RouteLink[] {
  const q = (p: Place) => enc(`${p.en}, ${cityEn(p)}`)
  const out: RouteLink[] = []
  let start = `${o.lat},${o.lon}`
  for (let i = 0; i < stops.length; i += 4) {
    const chunk = stops.slice(i, i + 4)
    const dest = chunk[chunk.length - 1]!
    const waypoints = chunk.slice(0, -1).map(q).join("|")
    const walking = chunk.every((p, j) => {
      const prev: LatLon = j ? chunk[j - 1]! : i ? stops[i - 1]! : o
      return km(prev, p) <= 2.2
    })
    const mode = walking ? "walking" : waypoints ? "driving" : "transit"
    out.push({
      from: i + 1,
      to: i + chunk.length,
      url: `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${q(dest)}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=${mode}`,
    })
    start = q(dest)
  }
  return out
}

/* ---------------- Planner helpers ---------------- */

/** Nearest-neighbour order from the hotel. Unknown ids are dropped. */
export function nearestNeighbour(ids: string[], from: LatLon): string[] {
  const rest = ids.map((id) => PLACE_BY_ID.get(id)).filter((p): p is Place => !!p)
  const out: string[] = []
  let cur: LatLon = from
  while (rest.length) {
    let bi = 0
    let bd = Infinity
    rest.forEach((p, i) => {
      const d = km(cur, p)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    const p = rest.splice(bi, 1)[0]!
    out.push(p.id)
    cur = p
  }
  return out
}

/* ---------------- Coordinates input ---------------- */

export type ParsedLocation = { ok: true; lat: number; lon: number } | { ok: false; reason: "short-link" | "none" | "range" }

export function parseLatLon(input: string): ParsedLocation {
  const s = (input || "").trim()
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s) && !/-?\d+\.\d+\s*,\s*-?\d+\.\d+/.test(s)) return { ok: false, reason: "short-link" }
  const dms =
    /(\d{1,3})°\s*(\d{1,2})['′]\s*([\d.]+)?["″]?\s*([NS])[,\s]+(\d{1,3})°\s*(\d{1,2})['′]\s*([\d.]+)?["″]?\s*([EW])/i.exec(s)
  if (dms) {
    const v = (d: string, m: string, sec: string | undefined, h: string) =>
      (Number(d) + Number(m) / 60 + (Number(sec) || 0) / 3600) * (/[SW]/i.test(h) ? -1 : 1)
    const lat = v(dms[1]!, dms[2]!, dms[3], dms[4]!)
    const lon = v(dms[5]!, dms[6]!, dms[7], dms[8]!)
    return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { ok: true, lat, lon } : { ok: false, reason: "range" }
  }
  const m =
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(s) ??
    /[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i.exec(s) ??
    /(-?\d{1,3}\.\d+)\s*[,\s]\s*(-?\d{1,3}\.\d+)/.exec(s)
  if (!m) return { ok: false, reason: "none" }
  const lat = Number(m[1])
  const lon = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { ok: true, lat, lon } : { ok: false, reason: "range" }
}
