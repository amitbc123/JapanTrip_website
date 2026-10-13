import L from "leaflet"
import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import {
  ITAYA_NOTE,
  RAW_RIDES,
  RIDES,
  formatDuration,
  formatLength,
  type RawRide,
  type SegmentKind,
} from "@/lib/tunnelRides"
import { useTunnelViewStore } from "@/stores/tunnel-view-store"

const STYLE: Record<SegmentKind, L.PolylineOptions> = {
  open: { color: "#475569", weight: 3, opacity: 0.9 },
  tunnel: { color: "#dc2626", weight: 7, opacity: 1, lineCap: "butt" },
  covered: { color: "#f59e0b", weight: 6, opacity: 1, dashArray: "6 5", lineCap: "butt" },
}
const CASING: L.PolylineOptions = { color: "#ffffff", weight: 11, opacity: 0.95, lineCap: "butt" }
const FADED_OPACITY = 0.18

/** The rides drawn on a given geometry (Train 9 and 10 share one). */
function ridesFor(dataId: string) {
  return RIDES.filter((r) => r.dataId === dataId)
}

function tunnelPopup(raw: RawRide, rawIndex: number): HTMLElement {
  const t = raw.tunnels[rawIndex]!
  const rides = ridesFor(raw.id)
  const view = rides[0]!
  const info = view.tunnels.find((x) => x.rawIndex === rawIndex)!
  const real = raw.tunnels.filter((x) => x.kind === "tunnel")
  const el = document.createElement("div")
  el.className = "flex min-w-48 flex-col gap-1 text-end"

  const add = (cls: string, text: string, dir?: string) => {
    const span = L.DomUtil.create("span", cls, el)
    span.textContent = text
    if (dir) span.dir = dir
  }
  if (t.kind === "covered") {
    add("font-semibold text-amber-700", "קטע מקורה (לא מנהרה)")
    add("text-xs text-muted-foreground", "גגון נגד שלג או קירוי - חשוך חלקית, עם פתחים לאור יום")
  } else {
    add("font-semibold text-red-700", t.name ?? "מנהרה")
    if (t.nameJa) add("text-xs text-muted-foreground", t.nameJa, "ltr")
    const position = real.indexOf(t)
    add("text-xs text-muted-foreground", `מנהרה ${position + 1} מתוך ${real.length} בנסיעה`)
  }
  add("text-sm", `אורך: ${formatLength(t.lengthM)}`)
  add("text-sm", `זמן בפנים: ${formatDuration(info.minutes)} (הערכה, לפי ${t.speedKmh} קמ"ש)`)
  for (const ride of rides) {
    const own = ride.tunnels.find((x) => x.rawIndex === rawIndex)!
    add("text-xs", `${ride.title}: בק"מ ${own.fromBoardingKm.toFixed(1)} מהעלייה לרכבת`)
  }
  if (info.inItayaPass) add("text-xs text-emerald-700", ITAYA_NOTE)
  return el
}

/** Draws our train routes with every tunnel highlighted, over a plain light
 *  base map, and hides nothing itself — the caller stops rendering the
 *  normal markers while this is mounted. Unmounting removes everything and
 *  puts the view back exactly where it was. */
export function TunnelLayer() {
  const map = useMap()
  const selectedRide = useTunnelViewStore((s) => s.selectedRide)
  const focus = useTunnelViewStore((s) => s.focus)
  const selectRide = useTunnelViewStore((s) => s.selectRide)
  const layersRef = useRef(new Map<string, { all: L.Polyline[]; tunnels: Map<number, L.Polyline> }>())
  const boundsRef = useRef(new Map<string, L.LatLngBounds>())

  useEffect(() => {
    const savedCenter = map.getCenter()
    const savedZoom = map.getZoom()

    // A quiet, label-light base so the routes stand out; sits above the
    // normal base layer and goes away with it.
    const base = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      zIndex: 50,
    }).addTo(map)
    const group = L.layerGroup().addTo(map)
    const all = L.latLngBounds([])

    for (const raw of RAW_RIDES) {
      const entry = { all: [] as L.Polyline[], tunnels: new Map<number, L.Polyline>() }
      const bounds = L.latLngBounds([])
      let tunnelIndex = 0
      for (const segment of raw.segments) {
        const latlngs = segment.coords as L.LatLngExpression[]
        if (segment.kind !== "open") {
          const casing = L.polyline(latlngs, { ...CASING, interactive: false }).addTo(group)
          entry.all.push(casing)
        }
        const line = L.polyline(latlngs, STYLE[segment.kind]).addTo(group)
        entry.all.push(line)
        if (segment.kind === "open") {
          line.on("click", () => selectRide(ridesFor(raw.id)[0]?.key ?? null))
        } else {
          const rawIndex = tunnelIndex++
          entry.tunnels.set(rawIndex, line)
          line.bindPopup(() => tunnelPopup(raw, rawIndex), {
            className: "trip-map-popup",
            maxWidth: 260,
            autoPanPaddingTopLeft: L.point(56, 16),
            autoPanPaddingBottomRight: L.point(64, 16),
          })
        }
        bounds.extend(line.getBounds())
      }
      layersRef.current.set(raw.id, entry)
      boundsRef.current.set(raw.id, bounds)
      all.extend(bounds)
    }
    if (all.isValid()) map.fitBounds(all, { padding: [20, 20] })

    const layers = layersRef.current
    const allBounds = boundsRef.current
    return () => {
      group.remove()
      base.remove()
      layers.clear()
      allBounds.clear()
      map.setView(savedCenter, savedZoom, { animate: false })
    }
  }, [map, selectRide])

  // Fade the other routes and zoom to the chosen ride.
  useEffect(() => {
    const dataId = RIDES.find((r) => r.key === selectedRide)?.dataId ?? null
    for (const [id, entry] of layersRef.current) {
      const dim = dataId !== null && id !== dataId
      for (const line of entry.all) line.setStyle({ opacity: dim ? FADED_OPACITY : 1 })
    }
    if (dataId && !focus) {
      const bounds = boundsRef.current.get(dataId)
      if (bounds?.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
    }
  }, [map, selectedRide, focus])

  useEffect(() => {
    if (!focus) return
    const ride = RIDES.find((r) => r.key === focus.rideKey)
    const tunnel = ride?.tunnels[focus.index]
    if (!ride || !tunnel) return
    const line = layersRef.current.get(ride.dataId)?.tunnels.get(tunnel.rawIndex)
    if (!line) return
    // Open once the view settles; if the view doesn't change at all no
    // "moveend" comes, hence the timer as well.
    let opened = false
    const open = () => {
      if (opened) return
      opened = true
      line.openPopup()
    }
    map.once("moveend", open)
    const timer = window.setTimeout(open, 900)
    map.fitBounds(line.getBounds(), { padding: [60, 60], maxZoom: 14 })
    return () => {
      window.clearTimeout(timer)
      map.off("moveend", open)
    }
  }, [map, focus])

  return null
}
