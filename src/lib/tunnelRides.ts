import routePublicRaw from "@/data/route-public.json"
import tunnelData from "@/data/train-tunnels.json"
import { formatHebrewDate } from "@/lib/format"
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
  key: string
  dataId: string
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

/** Built by scripts/build-train-tunnels.py from Overture Maps / OSM. */
export const RAW_RIDES = tunnelData as RawRide[]

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
const RIDE_ORDER: { dataId: string; label: string | null; reversed?: boolean; local?: string }[] = [
  { dataId: "train-1", label: "Train 1" },
  { dataId: "nikko-local", label: null, local: "2026-10-14" },
  { dataId: "train-2", label: "Train 2" },
  { dataId: "train-3", label: "Train 3" },
  { dataId: "train-4", label: "Train 4" },
  { dataId: "train-5", label: "Train 5" },
  { dataId: "train-6", label: "Train 6" },
  { dataId: "train-7", label: "Train 7" },
  { dataId: "train-8", label: "Train 8" },
  { dataId: "train-9", label: "Train 9" },
  { dataId: "train-9", label: "Train 10", reversed: true },
  { dataId: "train-11", label: "Train 11" },
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
  return {
    key: entry.label ?? entry.dataId,
    dataId: raw.id,
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

export const RIDES: RideView[] = RIDE_ORDER.map(buildRide).filter((r): r is RideView => r !== null)

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
