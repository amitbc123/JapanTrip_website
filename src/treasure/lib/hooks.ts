import { useEffect, useState } from "react"
import { REGIONS } from "@/treasure/data"
import { baseForDate, japanNow, originFor, regionForDate, regionNear, type JapanNow } from "@/treasure/lib/core"
import { useMyPoint } from "@/treasure/lib/location"
import { useTreasure, useUi } from "@/treasure/store"
import type { Base, Origin, Region } from "@/treasure/types"

/** Japan time, refreshed every 20 seconds. */
export function useNow(): JapanNow {
  const [now, setNow] = useState(() => japanNow())
  useEffect(() => {
    const id = window.setInterval(() => setNow(japanNow()), 20_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export interface TripContext {
  now: JapanNow
  /** Region shown. */
  region: Region
  /** Region by today's date (for "now" badges). */
  todayRegion: Region
  base: Base
  origin: Origin
  /** Region was chosen by location rather than date. */
  byLocation: boolean
}

/** Region, hotel and the point distances are measured from. */
export function useTripContext(): TripContext {
  const now = useNow()
  const chosen = useUi((s) => s.region)
  const pickedBase = useTreasure((s) => s.base)
  const me = useMyPoint(now.ms)
  const todayRegion = regionForDate(now.date)
  const near = me ? regionNear(me) : null
  const region = (chosen && REGIONS.find((r) => r.key === chosen)) || near || todayRegion
  const baseKey = pickedBase[region.key]
  const base = region.bases.find((b) => b.key === baseKey) ?? baseForDate(region, now.date)
  return {
    now,
    region,
    todayRegion,
    base,
    origin: originFor(region, base, me),
    byLocation: !chosen && !!near && near.key !== todayRegion.key,
  }
}
