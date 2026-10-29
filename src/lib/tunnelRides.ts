import roadData from "@/data/road-tunnels.json"
import routePublicRaw from "@/data/route-public.json"
import tunnelData from "@/data/train-tunnels.json"
import { formatHebrewDate } from "@/lib/format"
import type { TravelMode } from "@/stores/tunnel-view-store"
import type { RoutePublicData } from "@/types/trip"

export type SegmentKind = "open" | "tunnel" | "covered"

interface RawTunnel {
  kind: "tunnel" | "covered"
  lengthM: number
  startKm: number
  speedKmh: number
  start: [number, number]
  end: [number, number]
  name?: string
  nameJa?: string
  /** Road tunnels: the road it carries, and a note worth reading. */
  road?: string | null
  note?: string
}

export interface RawRide {
  id: string
  label: string | null
  from: string
  to: string
  lengthKm: number
  segments: { kind: SegmentKind; coords: [number, number][] }[]
  tunnels: RawTunnel[]
}

export interface TunnelInfo extends RawTunnel {
  /** Index into the raw ride's tunnels (map layer lookup). */
  rawIndex: number
  /** Km from where we board, in our direction of travel. */
  fromBoardingKm: number
  minutes: number
  inItayaPass: boolean
}

export interface RideView {
  mode: TravelMode
  key: string
  dataId: string
  /** Short map label, e.g. "5 · Kagayaki". */
  shortLabel: string
  color: string
  /** Where along the drawn route (0-1) its map label sits — chosen per ride
   *  so labels of rides sharing track (2/3, near Tokyo) don't collide. */
  labelAt: number
  title: string
  subtitle: string
  when: string
  booked: boolean
  reversed: boolean
  lengthKm: number
  tunnels: TunnelInfo[]
  tunnelCount: number
  coveredCount: number
  undergroundKm: number
  undergroundPct: number
  undergroundMinutes: number
  longest: TunnelInfo | null
}

interface RawDrive extends RawRide {
  fromOrder: number
  toOrder: number
  minutes: number
  motorwayKm: number
}

/** A road tunnel near our driving routes but not on them - shown in the car
 *  view for detours and day trips. */
export interface NearbyTunnel {
  lengthM: number
  speedKmh: number
  coords: [number, number][]
  road: string | null
  name?: string
  nameJa?: string
  note?: string
}

const roads = roadData as unknown as { drives: RawDrive[]; nearby: NearbyTunnel[] }

/** Train rides built by scripts/build-train-tunnels.py and car drives built
 *  by scripts/build-road-tunnels.py, both from Overture Maps / OSM. */
export const RAW_RIDES: RawRide[] = [...(tunnelData as RawRide[]), ...roads.drives]

export const NEARBY_ROAD_TUNNELS = roads.nearby

const routePublic = routePublicRaw as RoutePublicData

const STATION_HE: Record<string, string> = {
  浅草: "אסאקוסה",
  東武日光: "טובו-ניקו",
  日光: "JR ניקו",
  宇都宮: "אוטסונומיה",
  大石田: "אואישידה",
  東京: "טוקיו",
  小田原: "אודווארה",
  金沢: "קנאזאווה",
  名古屋: "נגויה",
  京都: "קיוטו",
  新大阪: "שין-אוסקה",
  広島: "הירושימה",
  熊本: "קומאמוטו",
  池袋: "איקבוקורו",
  西武秩父: "סייבו-צ'יצ'יבו",
  新宿: "שינג'וקו",
  成田空港: "נמל התעופה נריטה",
}

// Itaya Pass on the Yamagata Shinkansen (Fukushima–Yonezawa).
const ITAYA = { minLat: 37.76, maxLat: 37.86, minLon: 140.15, maxLon: 140.42 }

function inItaya([lat, lon]: [number, number]): boolean {
  return lat >= ITAYA.minLat && lat <= ITAYA.maxLat && lon >= ITAYA.minLon && lon <= ITAYA.maxLon
}

/** Our rides in trip order. Train 10 is Train 9's route driven backwards,
 *  so it reuses that geometry. */
const RIDE_ORDER: {
  dataId: string
  label: string | null
  color: string
  labelAt: number
  reversed?: boolean
  local?: string
}[] = [
  { dataId: "train-1", label: "Train 1", color: "#4a6fa5", labelAt: 0.55 },
  { dataId: "nikko-local", label: null, color: "#b8913f", labelAt: 0.5, local: "2026-10-14" },
  { dataId: "train-2", label: "Train 2", color: "#5b8c5a", labelAt: 0.8 },
  { dataId: "train-3", label: "Train 3", color: "#7e6ba6", labelAt: 0.9 },
  { dataId: "train-4", label: "Train 4", color: "#4e8c98", labelAt: 0.35 },
  { dataId: "train-5", label: "Train 5", color: "#ad5f7d", labelAt: 0.55 },
  { dataId: "train-6", label: "Train 6", color: "#b9774b", labelAt: 0.5 },
  { dataId: "train-7", label: "Train 7", color: "#4d8a80", labelAt: 0.5 },
  { dataId: "train-8", label: "Train 8", color: "#65679e", labelAt: 0.45 },
  { dataId: "train-9", label: "Train 9", color: "#8b7349", labelAt: 0.75 },
  { dataId: "train-9", label: "Train 10", color: "#8b7349", labelAt: 0.75, reversed: true },
  { dataId: "train-11", label: "Train 11", color: "#4e7591", labelAt: 0.75 },
]

function buildRide(entry: (typeof RIDE_ORDER)[number]): RideView | null {
  const raw = RAW_RIDES.find((r) => r.id === entry.dataId)
  if (!raw) return null
  const train = entry.label ? routePublic.trains.find((t) => t.label === entry.label) : undefined
  const fromName = STATION_HE[entry.reversed ? raw.to : raw.from] ?? raw.from
  const toName = STATION_HE[entry.reversed ? raw.from : raw.to] ?? raw.to

  const tunnels: TunnelInfo[] = raw.tunnels.map((t, rawIndex) => {
    const lengthKm = t.lengthM / 1000
    return {
      ...t,
      rawIndex,
      fromBoardingKm: entry.reversed ? Math.max(0, raw.lengthKm - t.startKm - lengthKm) : t.startKm,
      minutes: (lengthKm / t.speedKmh) * 60,
      inItayaPass: inItaya(t.start),
    }
  })
  if (entry.reversed) tunnels.reverse()

  const real = tunnels.filter((t) => t.kind === "tunnel")
  const undergroundKm = real.reduce((n, t) => n + t.lengthM, 0) / 1000
  const longest = real.reduce<TunnelInfo | null>((best, t) => (!best || t.lengthM > best.lengthM ? t : best), null)

  const date = train?.date ?? entry.local
  const times = train?.departTime && train.arriveTime ? ` · ${train.departTime}-${train.arriveTime}` : ""
  const number = entry.label?.replace("Train ", "")
  return {
    mode: "train",
    key: entry.label ?? entry.dataId,
    dataId: raw.id,
    shortLabel: train ? `${number} · ${train.trainNumber.split(" (")[0]}` : "JR ניקו",
    color: entry.color,
    labelAt: entry.labelAt,
    title: train ? `רכבת ${entry.label!.replace("Train ", "")} · ${train.trainNumber}` : "רכבת מקומית JR (ללא הזמנה)",
    subtitle: `${fromName} ← ${toName}`,
    when: date ? `${formatHebrewDate(date, true)}${times}` : "",
    booked: train?.booked ?? true,
    reversed: !!entry.reversed,
    lengthKm: raw.lengthKm,
    tunnels,
    tunnelCount: real.length,
    coveredCount: tunnels.length - real.length,
    undergroundKm,
    undergroundPct: raw.lengthKm ? Math.round((undergroundKm / raw.lengthKm) * 100) : 0,
    undergroundMinutes: real.reduce((n, t) => n + t.minutes, 0),
    longest,
  }
}

const TRAIN_RIDES: RideView[] = RIDE_ORDER.map(buildRide).filter((r): r is RideView => r !== null)

const DRIVE_COLORS = ["#4a6fa5", "#5b8c5a", "#ad5f7d", "#b9774b", "#7e6ba6", "#4e8c98", "#8b7349"]

function formatDriveTime(minutes: number): string {
  const rounded = Math.round(minutes / 5) * 5
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (hours === 0) return `כ-${rest} דק'`
  const hoursLabel = hours === 1 ? "כשעה" : `כ-${hours} שעות`
  return rest === 0 ? hoursLabel : `${hoursLabel} ו-${rest} דק'`
}

function buildDrive(raw: RawDrive, i: number): RideView {
  const tunnels: TunnelInfo[] = raw.tunnels.map((t, rawIndex) => ({
    ...t,
    rawIndex,
    fromBoardingKm: t.startKm,
    minutes: (t.lengthM / 1000 / t.speedKmh) * 60,
    inItayaPass: false,
  }))
  const real = tunnels.filter((t) => t.kind === "tunnel")
  const undergroundKm = real.reduce((n, t) => n + t.lengthM, 0) / 1000
  return {
    mode: "car",
    key: raw.id,
    dataId: raw.id,
    shortLabel: `${i + 1} · ${raw.to}`,
    color: DRIVE_COLORS[i % DRIVE_COLORS.length]!,
    labelAt: 0.5,
    title: `נסיעה ${i + 1} ברכב · ${raw.from} ← ${raw.to}`,
    subtitle: `${raw.lengthKm} ק"מ${raw.motorwayKm > 0 ? `, מהם ${raw.motorwayKm} בכביש מהיר` : ""}`,
    when: `${formatDriveTime(raw.minutes)} נהיגה בלי עצירות (הערכה)`,
    booked: true,
    reversed: false,
    lengthKm: raw.lengthKm,
    tunnels,
    tunnelCount: real.length,
    coveredCount: tunnels.length - real.length,
    undergroundKm,
    undergroundPct: raw.lengthKm ? Math.round((undergroundKm / raw.lengthKm) * 100) : 0,
    undergroundMinutes: real.reduce((n, t) => n + t.minutes, 0),
    longest: real.reduce<TunnelInfo | null>((best, t) => (!best || t.lengthM > best.lengthM ? t : best), null),
  }
}

const DRIVE_RIDES: RideView[] = roads.drives.map(buildDrive)

export const RIDES: RideView[] = [...TRAIN_RIDES, ...DRIVE_RIDES]

/** "כ-40 שניות" / "כ-5.5 דק'" — the estimates are rough, so no false
 *  precision. */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return `כ-${Math.max(10, Math.round((minutes * 60) / 10) * 10)} שניות`
  return `כ-${Math.round(minutes * 2) / 2} דק'`
}

export function formatLength(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} ק"מ` : `${meters} מ'`
}

export const ITAYA_NOTE =
  "מעבר איטאיה (板谷峠): לפי מסמך של JR East, הותקנה קליטה סלולרית במנהרות הקטעים טוגה-איטאיה, איטאיה-אקאיווה ואקאיווה-ניוואסאקה. בקטע אוסאווה-טוגה העבודות היו בביצוע בזמן פרסום המסמך."

/** A door-to-door move between two of our hotels (or a day trip), made of
 *  one or more of the rides above. */
export interface JourneyView {
  mode: TravelMode
  key: string
  number: number
  title: string
  when: string
  rides: RideView[]
  /** Hotel at each end; `null` order = not a hotel (the airport). */
  from: { order: number | null; label: string; at: [number, number] }
  to: { order: number | null; label: string; at: [number, number] }
  /** Dashed links for the stretches not drawn as a train (hotel to
   *  station, bus, local train), with what they are. */
  links: { from: [number, number]; to: [number, number]; note: string }[]
  tunnelCount: number
  undergroundKm: number
  undergroundMinutes: number
  longest: { ride: RideView; tunnel: TunnelInfo } | null
}

const NARITA: [number, number] = [35.7647, 140.3864]

function hotelAt(order: number): [number, number] {
  const stop = routePublic.hotels.find((h) => h.order === order)
  return [stop?.lat ?? 0, stop?.lon ?? 0]
}

function rideEnds(ride: RideView): { start: [number, number]; end: [number, number] } {
  const raw = RAW_RIDES.find((r) => r.id === ride.dataId)!
  const first = raw.segments[0]!.coords[0]!
  const lastSeg = raw.segments[raw.segments.length - 1]!
  const last = lastSeg.coords[lastSeg.coords.length - 1]!
  return ride.reversed ? { start: last, end: first } : { start: first, end: last }
}

const JOURNEY_DEFS: {
  title: string
  date: string
  from: number
  to: number | "airport"
  rides: string[]
  startNote: string
  endNote: string
}[] = [
  { title: "טוקיו ← ניקו", date: "2026-10-10", from: 1, to: 2, rides: ["Train 1"], startNote: "מהמלון לאסאקוסה (רכבת תחתית)", endNote: "מטובו-ניקו למלון (הליכה)" },
  { title: "ניקו ← גינזן אונסן", date: "2026-10-14", from: 2, to: 3, rides: ["nikko-local", "Train 2"], startNote: "מהמלון לתחנת JR ניקו (הליכה)", endNote: "אוטובוס מאואישידה לגינזן אונסן, כ-40 דק'" },
  { title: "גינזן אונסן ← יוקוהמה", date: "2026-10-16", from: 3, to: 4, rides: ["Train 3"], startNote: "אוטובוס מגינזן אונסן לאואישידה, כ-40 דק'", endNote: "רכבת מקומית JR מטוקיו ליוקוהמה (בלי מנהרות ארוכות)" },
  { title: "האקונה ← קנאזאווה", date: "2026-10-24", from: 6, to: 7, rides: ["Train 4", "Train 5"], startNote: "ברכב 1 מהאקונה לאודווארה", endNote: "מתחנת קנאזאווה למלון" },
  { title: "נגויה ← קיוטו", date: "2026-11-05", from: 14, to: 15, rides: ["Train 6"], startNote: "מהמלון לתחנת נגויה", endNote: "מתחנת קיוטו למלון" },
  { title: "אוסקה ← הירושימה", date: "2026-11-17", from: 16, to: 17, rides: ["Train 7"], startNote: "מהמלון לתחנת שין-אוסקה (רכבת תחתית)", endNote: "מתחנת הירושימה למלון" },
  { title: "הירושימה ← קומאמוטו", date: "2026-11-19", from: 17, to: 18, rides: ["Train 8"], startNote: "מהמלון לתחנת הירושימה", endNote: "מתחנת קומאמוטו למלון" },
  { title: "טיול יום לצ'יצ'יבו וחזרה", date: "2026-12-03", from: 20, to: 20, rides: ["Train 9", "Train 10"], startNote: "מהמלון בשינג'וקו לאיקבוקורו", endNote: "מאיקבוקורו חזרה למלון" },
  { title: "שינג'וקו ← נמל התעופה נריטה", date: "2026-12-06", from: 20, to: "airport", rides: ["Train 11"], startNote: "מהמלון לתחנת שינג'וקו", endNote: "" },
]

/** Straight-line distance in metres (good enough to skip tiny links). */
function roughMeters(a: [number, number], b: [number, number]): number {
  const dLat = (a[0] - b[0]) * 111_000
  const dLon = (a[1] - b[1]) * 111_000 * Math.cos((a[0] * Math.PI) / 180)
  return Math.hypot(dLat, dLon)
}

const TRAIN_JOURNEYS: JourneyView[] = JOURNEY_DEFS.map((def, i) => {
  const rides = def.rides.map((key) => RIDES.find((r) => r.key === key)).filter((r): r is RideView => !!r)
  const fromAt = hotelAt(def.from)
  const toAt = def.to === "airport" ? NARITA : hotelAt(def.to)
  const links: JourneyView["links"] = []
  const firstRide = rides[0]
  const lastRide = rides[rides.length - 1]
  if (firstRide) {
    const { start } = rideEnds(firstRide)
    if (roughMeters(fromAt, start) > 300) links.push({ from: fromAt, to: start, note: def.startNote })
  }
  for (let r = 1; r < rides.length; r++) {
    const prevEnd = rideEnds(rides[r - 1]!).end
    const nextStart = rideEnds(rides[r]!).start
    if (roughMeters(prevEnd, nextStart) > 300) links.push({ from: prevEnd, to: nextStart, note: "מעבר בין רכבות" })
  }
  if (lastRide && def.endNote) {
    const { end } = rideEnds(lastRide)
    if (roughMeters(end, toAt) > 300) links.push({ from: end, to: toAt, note: def.endNote })
  }
  const all = rides.flatMap((ride) => ride.tunnels.filter((t) => t.kind === "tunnel").map((tunnel) => ({ ride, tunnel })))
  return {
    mode: "train",
    key: `journey-${i + 1}`,
    number: i + 1,
    title: def.title,
    when: formatHebrewDate(def.date, true),
    rides,
    from: { order: def.from, label: `מלון ${def.from}`, at: fromAt },
    to:
      def.to === "airport"
        ? { order: null, label: "נמל התעופה נריטה", at: toAt }
        : { order: def.to, label: `מלון ${def.to}`, at: toAt },
    links,
    tunnelCount: all.length,
    undergroundKm: all.reduce((n, x) => n + x.tunnel.lengthM, 0) / 1000,
    undergroundMinutes: all.reduce((n, x) => n + x.tunnel.minutes, 0),
    longest: all.reduce<JourneyView["longest"]>(
      (best, x) => (!best || x.tunnel.lengthM > best.tunnel.lengthM ? x : best),
      null
    ),
  }
})

/** Each car day is one drive from hotel to hotel. */
const DRIVE_JOURNEYS: JourneyView[] = roads.drives.map((raw, i) => {
  const ride = DRIVE_RIDES[i]!
  const fromAt = hotelAt(raw.fromOrder)
  const toAt = hotelAt(raw.toOrder)
  return {
    mode: "car",
    key: `drive-journey-${i + 1}`,
    number: i + 1,
    title: `${raw.from} ← ${raw.to}`,
    when: "",
    rides: [ride],
    from: { order: raw.fromOrder, label: `מלון ${raw.fromOrder}`, at: fromAt },
    to: { order: raw.toOrder, label: `מלון ${raw.toOrder}`, at: toAt },
    links: [],
    tunnelCount: ride.tunnelCount,
    undergroundKm: ride.undergroundKm,
    undergroundMinutes: ride.undergroundMinutes,
    longest: ride.longest ? { ride, tunnel: ride.longest } : null,
  }
})

export const JOURNEYS: JourneyView[] = [...TRAIN_JOURNEYS, ...DRIVE_JOURNEYS]

export function journeysFor(mode: TravelMode): JourneyView[] {
  return JOURNEYS.filter((j) => j.mode === mode)
}

/** Every drawn point of each mode's routes, for telling train from car by
 *  where we are. */
export function routeLines(mode: TravelMode): [number, number][][] {
  const ids = new Set(RIDES.filter((r) => r.mode === mode).map((r) => r.dataId))
  return RAW_RIDES.filter((r) => ids.has(r.id)).flatMap((r) => r.segments.map((s) => s.coords))
}

export function journeyOf(rideKey: string): JourneyView | undefined {
  return JOURNEYS.find((j) => j.rides.some((r) => r.key === rideKey))
}
