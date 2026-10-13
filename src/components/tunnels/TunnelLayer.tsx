import L from "leaflet"
import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import { createAirportIcon, createHotelIcon } from "@/components/map/icons"
import {
  ITAYA_NOTE,
  JOURNEYS,
  RAW_RIDES,
  RIDES,
  formatDuration,
  formatLength,
  journeyOf,
  type RawRide,
  type RideView,
} from "@/lib/tunnelRides"
import { useTunnelViewStore } from "@/stores/tunnel-view-store"

const FADED_OPACITY = 0.12
const LABEL_NAMES_ZOOM = 9
// Tunnel badges ("🚇 23.4") appear by size as you zoom in, so the
// country-wide view isn't buried: 10 km+ from zoom 7, 4 km+ from 9, the
// rest (1.5 km+) from 11.
const BADGE_MIN_M = 1500
const BADGE_BIG_M = 4000
const BADGE_HUGE_M = 10000
const BADGE_TIERS = [7, 9, 11]

function haloWeight(zoom: number): number {
  return zoom < 7 ? 6 : zoom < 9 ? 12 : 22
}

/** The rides drawn on a given geometry (Train 9 and 10 share one). */
function ridesFor(dataId: string): RideView[] {
  return RIDES.filter((r) => r.dataId === dataId)
}

function addLine(parent: HTMLElement, cls: string, text: string, dir?: string) {
  const span = L.DomUtil.create("span", cls, parent)
  span.textContent = text
  if (dir) span.dir = dir
  return span
}

function popupBox(): HTMLElement {
  const el = document.createElement("div")
  el.className = "flex min-w-52 flex-col gap-1 text-end"
  return el
}

function ridePopup(rides: RideView[], onDetails: (key: string) => void): HTMLElement {
  const el = popupBox()
  const journey = journeyOf(rides[0]!.key)
  if (journey) {
    const part = journey.rides.findIndex((r) => r.key === rides[0]!.key) + 1
    addLine(
      el,
      "text-xs font-medium text-muted-foreground",
      `מסע ${journey.number} · ${journey.title}${journey.rides.length > 1 ? ` · רכבת ${part} מתוך ${journey.rides.length}` : ""}`
    )
  }
  for (const ride of rides) {
    const title = addLine(el, "flex items-center justify-end gap-2 font-semibold", "")
    const dot = L.DomUtil.create("span", "inline-block size-3 shrink-0 rounded-full", title)
    dot.style.background = ride.color
    L.DomUtil.create("span", "", title).textContent = ride.title
    addLine(el, "text-sm", ride.subtitle)
    if (ride.when) addLine(el, "text-xs text-muted-foreground", ride.when)
  }
  const ride = rides[0]!
  if (ride.tunnelCount === 0) {
    addLine(el, "text-sm font-medium text-emerald-700", "🎉 אין מנהרות בנסיעה הזו")
  } else {
    addLine(
      el,
      "text-sm",
      `${ride.tunnelCount} מנהרות · ${ride.undergroundKm.toFixed(1)} ק"מ בפנים (${ride.undergroundPct}%)`
    )
    addLine(el, "text-sm", `סה"כ בתוך מנהרות: ${formatDuration(ride.undergroundMinutes)}`)
    if (ride.longest) {
      addLine(
        el,
        "text-sm",
        `הארוכה: ${ride.longest.name ?? "מנהרה"}, ${formatLength(ride.longest.lengthM)}, ${formatDuration(ride.longest.minutes)}`
      )
    }
  }
  for (const r of rides) {
    const btn = L.DomUtil.create("button", "trip-map-toast-action mt-1 self-start", el)
    btn.type = "button"
    btn.textContent = rides.length > 1 ? `פירוט ${r.shortLabel} ↓` : "רשימת המנהרות ↓"
    L.DomEvent.on(btn, "click", (e) => {
      L.DomEvent.stop(e)
      onDetails(r.key)
    })
  }
  return el
}

function tunnelPopup(raw: RawRide, rawIndex: number): HTMLElement {
  const t = raw.tunnels[rawIndex]!
  const rides = ridesFor(raw.id)
  const info = rides[0]!.tunnels.find((x) => x.rawIndex === rawIndex)!
  const real = raw.tunnels.filter((x) => x.kind === "tunnel")
  const el = popupBox()
  if (t.kind === "covered") {
    addLine(el, "font-semibold text-amber-700", "קטע מקורה (לא מנהרה)")
    addLine(el, "text-xs text-muted-foreground", "גגון נגד שלג או קירוי - חשוך חלקית, עם פתחים לאור יום")
  } else {
    addLine(el, "font-semibold", `🚇 ${t.name ?? "מנהרה"}`)
    if (t.nameJa) addLine(el, "text-xs text-muted-foreground", t.nameJa, "ltr")
    addLine(el, "text-xs text-muted-foreground", `מנהרה ${real.indexOf(t) + 1} מתוך ${real.length} בנסיעה`)
  }
  addLine(el, "text-sm", `אורך: ${formatLength(t.lengthM)}`)
  addLine(el, "text-sm", `זמן בפנים: ${formatDuration(info.minutes)} (הערכה, לפי ${t.speedKmh} קמ"ש)`)
  for (const ride of rides) {
    const own = ride.tunnels.find((x) => x.rawIndex === rawIndex)!
    addLine(el, "text-xs", `${ride.shortLabel}: ק"מ ${own.fromBoardingKm.toFixed(1)} מהעלייה לרכבת`)
  }
  if (info.inItayaPass) addLine(el, "text-xs text-emerald-700", ITAYA_NOTE)
  return el
}

/** Point at `fraction` of the polyline's length. */
function pointAlong(coords: [number, number][], fraction: number): L.LatLng {
  const pts = coords.map(([lat, lon]) => L.latLng(lat, lon))
  const lengths = pts.slice(1).map((p, i) => pts[i]!.distanceTo(p))
  const target = lengths.reduce((a, b) => a + b, 0) * fraction
  let walked = 0
  for (let i = 0; i < lengths.length; i++) {
    const d = lengths[i]!
    if (walked + d >= target && d > 0) {
      const f = (target - walked) / d
      const a = pts[i]!
      const b = pts[i + 1]!
      return L.latLng(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f)
    }
    walked += d
  }
  return pts[pts.length - 1]!
}

const POPUP_OPTIONS: L.PopupOptions = {
  className: "trip-map-popup",
  maxWidth: 270,
  autoPanPaddingTopLeft: L.point(56, 16),
  autoPanPaddingBottomRight: L.point(64, 16),
}

interface RideLayers {
  /** Everything drawn for the ride, with its normal opacity. */
  layers: { layer: L.Path; opacity: number }[]
  labels: L.Marker[]
  tunnels: Map<number, L.Polyline>
  bounds: L.LatLngBounds
}

/** Our train rides over the normal base map, each in its own colour with a
 *  label, tunnels as thick black stretches of the ride's line. The caller
 *  stops rendering the normal markers while this is mounted; unmounting
 *  removes everything and puts the view back exactly where it was. */
export function TunnelLayer() {
  const map = useMap()
  const selectedRide = useTunnelViewStore((s) => s.selectedRide)
  const focus = useTunnelViewStore((s) => s.focus)
  const fitSelected = useTunnelViewStore((s) => s.fitSelected)
  const ridesRef = useRef(new Map<string, RideLayers>())
  const journeyLayersRef = useRef(new Map<string, RideLayers>())
  const hotelMarkersRef = useRef(new Map<string, { marker: L.Marker; journeys: string[] }>())

  useEffect(() => {
    const { selectRide, showRideDetails } = useTunnelViewStore.getState()
    const savedCenter = map.getCenter()
    const savedZoom = map.getZoom()
    const group = L.layerGroup().addTo(map)
    const all = L.latLngBounds([])
    const journeyLayers = journeyLayersRef.current
    const halos: L.Polyline[] = []
    const hotelMarkers = hotelMarkersRef.current

    const openDetails = (key: string) => {
      map.closePopup()
      showRideDetails(key)
      window.setTimeout(
        () => document.getElementById(`tunnel-ride-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50
      )
    }

    for (const raw of RAW_RIDES) {
      const views = ridesFor(raw.id)
      const view = views[0]
      if (!view) continue
      const color = view.color
      const entry: RideLayers = { layers: [], labels: [], tunnels: new Map(), bounds: L.latLngBounds([]) }
      const add = (layer: L.Path, opacity: number) => {
        layer.addTo(group)
        entry.layers.push({ layer, opacity })
      }
      const openRide = (latlng: L.LatLng) => {
        selectRide(view.key, false)
        L.popup(POPUP_OPTIONS).setLatLng(latlng).setContent(ridePopup(views, openDetails)).openOn(map)
      }

      // Pass 1: white casing + the ride's coloured line along the whole ride.
      for (const segment of raw.segments) {
        const latlngs = segment.coords as L.LatLngExpression[]
        add(L.polyline(latlngs, { color: "#ffffff", weight: 9, opacity: 0.9, interactive: false }), 0.9)
        const line = L.polyline(latlngs, { color, weight: 5, opacity: 1 })
        line.on("click", (e) => {
          L.DomEvent.stop(e)
          openRide(e.latlng)
        })
        add(line, 1)
        entry.bounds.extend(line.getBounds())
      }
      // Pass 2: tunnels / roofed track on top, thick and dark with the ride
      // colour still showing through the middle.
      let tunnelIndex = 0
      for (const segment of raw.segments) {
        if (segment.kind === "open") continue
        const latlngs = segment.coords as L.LatLngExpression[]
        const isTunnel = segment.kind === "tunnel"
        const casing = L.polyline(latlngs, {
          color: isTunnel ? "#111827" : "#6b7280",
          weight: isTunnel ? 12 : 10,
          opacity: 1,
          lineCap: "butt",
          dashArray: isTunnel ? undefined : "8 5",
        })
        const core = L.polyline(latlngs, { color, weight: 4, opacity: 1, lineCap: "butt", interactive: false })
        // A wide red halo so a tunnel reads as "this whole area is
        // underground" even zoomed out, where the line itself is thin.
        if (isTunnel) {
          const halo = L.polyline(latlngs, {
            color: "#ef4444",
            weight: haloWeight(map.getZoom()),
            opacity: 0.35,
            lineCap: "round",
            interactive: false,
          })
          add(halo, 0.35)
          halos.push(halo)
        }
        add(casing, 1)
        add(core, 1)
        const rawIndex = tunnelIndex++
        entry.tunnels.set(rawIndex, casing)
        casing.bindPopup(() => tunnelPopup(raw, rawIndex), POPUP_OPTIONS)
        casing.on("click", () => selectRide(view.key, false))

        const lengthM = raw.tunnels[rawIndex]?.lengthM ?? 0
        if (isTunnel && lengthM >= BADGE_MIN_M) {
          const size = lengthM >= BADGE_HUGE_M ? "huge" : lengthM >= BADGE_BIG_M ? "big" : "mid"
          const badge = L.marker(casing.getCenter(), {
            icon: L.divIcon({
              className: "trip-tunnel-badge-icon",
              html: `<span class="trip-tunnel-badge" data-size="${size}" dir="ltr">🚇 ${(lengthM / 1000).toFixed(1)}</span>`,
              iconSize: [0, 0],
            }),
            zIndexOffset: 1400,
            keyboard: false,
          }).addTo(group)
          badge.on("click", () => {
            selectRide(view.key, false)
            casing.openPopup()
          })
          entry.labels.push(badge)
        }
      }

      // One label per drawn route (Train 9 and 10 share theirs).
      const coords = raw.segments.flatMap((s, i) => (i === 0 ? s.coords : s.coords.slice(1)))
      const at = pointAlong(coords, view.labelAt)
      const numbers = views.map((v) => v.shortLabel.split(" · ")[0]).join("/")
      const name = view.shortLabel.split(" · ")[1] ?? view.shortLabel
      const label = L.marker(at, {
        icon: L.divIcon({
          className: "trip-ride-label",
          html: `<span class="trip-ride-pill" dir="ltr" style="--ride-color:${color}"><b>${numbers}</b><i>${name}</i></span>`,
          iconSize: [0, 0],
        }),
        zIndexOffset: 1500,
        keyboard: false,
      }).addTo(group)
      label.on("click", () => openRide(at))
      entry.labels.push(label)

      ridesRef.current.set(raw.id, entry)
      all.extend(entry.bounds)
    }
    // Journeys: the hotels at each end and dashed links for the parts
    // that aren't one of our trains (hotel to station, bus, local train).
    const hotelsDrawn = new Set<string>()
    for (const journey of JOURNEYS) {
      const entry: RideLayers = { layers: [], labels: [], tunnels: new Map(), bounds: L.latLngBounds([]) }
      for (const link of journey.links) {
        const line = L.polyline([link.from, link.to], {
          color: "#374151",
          weight: 3,
          opacity: 0.9,
          dashArray: "2 7",
          lineCap: "round",
        }).addTo(group)
        line.bindTooltip(link.note, { sticky: true, direction: "top" })
        entry.layers.push({ layer: line, opacity: 0.9 })
        entry.bounds.extend(line.getBounds())
      }
      for (const end of [journey.from, journey.to]) {
        entry.bounds.extend(end.at)
        const id = `${end.order ?? "airport"}`
        if (hotelsDrawn.has(id)) continue
        hotelsDrawn.add(id)
        const marker = L.marker(end.at, {
          icon: end.order === null ? createAirportIcon(end.label) : createHotelIcon(end.order, end.label),
          zIndexOffset: 1200,
          keyboard: false,
        }).addTo(group)
        const journeysHere = JOURNEYS.filter((j) => j.from.order === end.order || j.to.order === end.order)
        marker.bindTooltip(
          `${end.label} · ${journeysHere.map((j) => `מסע ${j.number}`).join(", ")}`,
          { direction: "top", offset: [0, -14] }
        )
        hotelMarkers.set(id, { marker, journeys: journeysHere.map((j) => j.key) })
      }
      journeyLayers.set(journey.key, entry)
    }

    if (all.isValid()) map.fitBounds(all, { padding: [20, 20] })

    // Zoomed out the labels are just numbered dots (the whole country's
    // routes overlap); from city level they also show the train's name.
    const container = map.getContainer()
    const syncLabelNames = () => {
      const zoom = map.getZoom()
      container.classList.toggle("show-ride-names", zoom >= LABEL_NAMES_ZOOM)
      BADGE_TIERS.forEach((tier, i) => container.classList.toggle(`show-tunnel-badges-${i}`, zoom >= tier))
      for (const halo of halos) halo.setStyle({ weight: haloWeight(zoom) })
    }
    syncLabelNames()
    map.on("zoomend", syncLabelNames)

    const rides = ridesRef.current
    return () => {
      map.off("zoomend", syncLabelNames)
      container.classList.remove("show-ride-names", ...BADGE_TIERS.map((_, i) => `show-tunnel-badges-${i}`))
      journeyLayers.clear()
      hotelMarkers.clear()
      group.remove()
      rides.clear()
      map.closePopup()
      map.setView(savedCenter, savedZoom, { animate: false })
    }
  }, [map])

  // Fade everything outside the chosen ride or journey and zoom to it.
  useEffect(() => {
    const journey = JOURNEYS.find((j) => j.key === selectedRide)
    const ride = RIDES.find((r) => r.key === selectedRide)
    const ownJourney = journey ?? (ride ? journeyOf(ride.key) : undefined)
    const litRides = journey
      ? new Set(journey.rides.map((r) => r.dataId))
      : ride
        ? new Set([ride.dataId])
        : null
    for (const [id, entry] of ridesRef.current) {
      const dim = litRides !== null && !litRides.has(id)
      for (const { layer, opacity } of entry.layers) layer.setStyle({ opacity: dim ? FADED_OPACITY : opacity })
      for (const label of entry.labels) label.setOpacity(dim ? 0.2 : 1)
      if (!dim && litRides !== null) for (const { layer } of entry.layers) layer.bringToFront()
    }
    for (const [key, entry] of journeyLayersRef.current) {
      const dim = litRides !== null && key !== ownJourney?.key
      for (const { layer, opacity } of entry.layers) layer.setStyle({ opacity: dim ? FADED_OPACITY : opacity })
    }
    for (const { marker, journeys } of hotelMarkersRef.current.values()) {
      marker.setOpacity(litRides !== null && !journeys.includes(ownJourney?.key ?? "") ? 0.25 : 1)
    }
    if (litRides && !focus && fitSelected) {
      const bounds = L.latLngBounds([])
      for (const id of litRides) {
        const b = ridesRef.current.get(id)?.bounds
        if (b?.isValid()) bounds.extend(b)
      }
      if (journey) {
        const jb = journeyLayersRef.current.get(journey.key)?.bounds
        if (jb?.isValid()) bounds.extend(jb)
      }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
    }
  }, [map, selectedRide, focus, fitSelected])

  useEffect(() => {
    if (!focus) return
    const ride = RIDES.find((r) => r.key === focus.rideKey)
    const tunnel = ride?.tunnels[focus.index]
    if (!ride || !tunnel) return
    const line = ridesRef.current.get(ride.dataId)?.tunnels.get(tunnel.rawIndex)
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
