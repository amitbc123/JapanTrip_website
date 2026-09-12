import type { TransportMode } from "@/types/trip"

// Sanity bounding box for Japan (lat 24-46, lon 122-146), matching
// scripts/geocode.mjs — kept here too so any runtime rendering code can
// defensively re-check a coordinate before plotting it.
export const JAPAN_BOUNDS = { minLat: 24, maxLat: 46, minLon: 122, maxLon: 146 }

export function isInJapanBounds(lat: number, lon: number): boolean {
  return (
    lat >= JAPAN_BOUNDS.minLat &&
    lat <= JAPAN_BOUNDS.maxLat &&
    lon >= JAPAN_BOUNDS.minLon &&
    lon <= JAPAN_BOUNDS.maxLon
  )
}

export type LineStyle = "solid" | "dashed" | "dotted"

const LINE_STYLE_BY_TRANSPORT: Record<TransportMode, LineStyle> = {
  train: "solid",
  car: "dashed",
  flight: "dotted",
}

/** train/transit -> solid, car -> dashed, flight -> dotted (per spec). */
export function lineStyleForTransport(mode: TransportMode): LineStyle {
  return LINE_STYLE_BY_TRANSPORT[mode] ?? "solid"
}

export const LEAFLET_DASH_ARRAY: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: "10 8",
  dotted: "2 8",
}
