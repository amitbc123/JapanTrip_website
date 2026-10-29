import routePublicRaw from "@/data/route-public.json"
import { routeLines } from "@/lib/tunnelRides"
import { todayInJapan } from "@/lib/upcoming"
import { type LivePosition, type TravelMode, useTunnelViewStore } from "@/stores/tunnel-view-store"
import type { RoutePublicData } from "@/types/trip"

const routePublic = routePublicRaw as RoutePublicData

/** Closer than this to one mode's route and well away from the other's
 *  counts as being on it (GPS in a car or train is usually within ~30 m). */
const ON_ROUTE_M = 80
const OFF_ROUTE_M = 250
/** Faster than any car on Japanese roads (~160 km/h): a Shinkansen. */
const TRAIN_SPEED_MS = 45

export type ModeSource = "manual" | "location" | "speed" | "date"

function nowInJapanTime(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now)
}

/** "car" while one of our rental cars is in hand (from pickup time to
 *  dropoff time), "train" otherwise. */
export function modeByDate(now = new Date()): TravelMode {
  const today = todayInJapan(now)
  const time = nowInJapanTime(now)
  for (const car of routePublic.cars) {
    const start = `${car.pickupDate}T${car.pickupTime}`
    const end = `${car.dropoffDate}T${car.dropoffTime}`
    const at = `${today}T${time}`
    if (start <= at && at <= end) return "car"
  }
  return "train"
}

/** Metres from a point to the nearest of these lines (equirectangular,
 *  plenty accurate at these distances). */
function distanceToLines(lat: number, lon: number, lines: [number, number][][]): number {
  const kx = 111_320 * Math.cos((lat * Math.PI) / 180)
  const ky = 110_540
  let best = Infinity
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [aLat, aLon] = line[i - 1]!
      const [bLat, bLon] = line[i]!
      const ax = (aLon - lon) * kx
      const ay = (aLat - lat) * ky
      const bx = (bLon - lon) * kx
      const by = (bLat - lat) * ky
      // Quick reject: both ends far on the same side.
      if ((ax > best && bx > best) || (ax < -best && bx < -best)) continue
      if ((ay > best && by > best) || (ay < -best && by < -best)) continue
      const dx = bx - ax
      const dy = by - ay
      const len2 = dx * dx + dy * dy
      const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0
      const d = Math.hypot(ax + t * dx, ay + t * dy)
      if (d < best) best = d
    }
  }
  return best
}

let linesCache: Record<TravelMode, [number, number][][]> | null = null

function lines(): Record<TravelMode, [number, number][][]> {
  linesCache ??= { train: routeLines("train"), car: routeLines("car") }
  return linesCache
}

/** Train or car from where we are: on one mode's route and away from the
 *  other's, or moving at Shinkansen speed. Null when it can't tell (both
 *  routes close by, or neither). */
export function modeByPosition(position: LivePosition): { mode: TravelMode; source: "location" | "speed" } | null {
  if (position.speed !== null && position.speed > TRAIN_SPEED_MS) return { mode: "train", source: "speed" }
  const { train, car } = lines()
  const toTrain = distanceToLines(position.lat, position.lon, train)
  const toCar = distanceToLines(position.lat, position.lon, car)
  if (toCar <= ON_ROUTE_M && toTrain >= OFF_ROUTE_M) return { mode: "car", source: "location" }
  if (toTrain <= ON_ROUTE_M && toCar >= OFF_ROUTE_M) return { mode: "train", source: "location" }
  return null
}

/** A location-based answer stays in force this long after the last fix
 *  that could tell (at a junction, or with the GPS briefly lost). */
const KEEP_LOCATION_MS = 15 * 60 * 1000

// Every fix of the live location dot updates the location-based answer,
// starting with the one already there when this (lazily loaded) module
// arrives.
function checkPosition(position: LivePosition | null) {
  if (!position) return
  const found = modeByPosition(position)
  if (found) useTunnelViewStore.setState({ detected: { ...found, at: Date.now() } })
}
checkPosition(useTunnelViewStore.getState().position)
useTunnelViewStore.subscribe((state, prev) => {
  if (state.position !== prev.position) checkPosition(state.position)
})

export function detectMode(
  detected: { mode: TravelMode; source: ModeSource; at: number } | null,
  manual: TravelMode | null,
  now = new Date()
): { mode: TravelMode; source: ModeSource } {
  if (manual) return { mode: manual, source: "manual" }
  if (detected && now.getTime() - detected.at < KEEP_LOCATION_MS) return { mode: detected.mode, source: detected.source }
  return { mode: modeByDate(now), source: "date" }
}

export const MODE_SOURCE_LABEL: Record<ModeSource, string> = {
  manual: "נבחר ידנית",
  location: "זוהה לפי המיקום",
  speed: "זוהה לפי המהירות",
  date: "זוהה לפי התאריך",
}

/** The tunnel view's current mode, re-evaluated on every location fix. */
export function useTravelMode(): { mode: TravelMode; source: ModeSource } {
  const detected = useTunnelViewStore((s) => s.detected)
  const manual = useTunnelViewStore((s) => s.manualMode)
  return detectMode(detected, manual)
}
