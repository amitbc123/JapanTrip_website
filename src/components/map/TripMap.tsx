import L from "leaflet"
import { useEffect, useMemo, useRef } from "react"
import { LayersControl, MapContainer, TileLayer, useMap } from "react-leaflet"
import { AttractionMarker } from "@/components/map/AttractionMarker"
import { createFlythroughIcon } from "@/components/map/icons"
import { HotelMarker } from "@/components/map/HotelMarker"
import { RouteSegments } from "@/components/map/RouteSegments"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import { useRouteFlythroughStore } from "@/stores/route-flythrough-store"
import type { Attraction, CarLeg, FlightLeg, Hotel } from "@/types/trip"

interface TripMapProps {
  hotels: Hotel[]
  attractions: Attraction[]
  cars: CarLeg[]
  flights: FlightLeg[]
  targetHotelOrder?: number
  targetAttractionName?: string
}

function FitBounds({ points, skip }: { points: [number, number][]; skip: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0 || skip) return
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
  }, [map, points, skip])
  return null
}

function FocusHotel({
  targetOrder,
  markerRefs,
}: {
  targetOrder: number | undefined
  markerRefs: React.RefObject<Map<number, L.Marker>>
}) {
  const map = useMap()
  useEffect(() => {
    if (!targetOrder) return
    const marker = markerRefs.current.get(targetOrder)
    if (!marker) return
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true })
    marker.openPopup()
  }, [map, markerRefs, targetOrder])
  return null
}

function FocusAttraction({
  targetName,
  markerRefs,
}: {
  targetName: string | undefined
  markerRefs: React.RefObject<Map<string, L.Marker>>
}) {
  const map = useMap()
  useEffect(() => {
    if (!targetName) return
    const marker = markerRefs.current.get(targetName)
    if (!marker) return
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true })
    marker.openPopup()
  }, [map, markerRefs, targetName])
  return null
}

/** Zooms/pans to fit exactly the currently-highlighted car/flight's covered
 *  stops (all of coversHotelLegOrders, not just endpoints) — leaves the view
 *  untouched on deselect, per spec. */
function FitHighlightedSegment({ hotels, cars, flights }: { hotels: Hotel[]; cars: CarLeg[]; flights: FlightLeg[] }) {
  const map = useMap()
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)

  useEffect(() => {
    if (!highlightedKey) return
    const covering =
      cars.find((c) => c.bookingNumber === highlightedKey)?.coversHotelLegOrders ??
      flights.find((f) => f.flightNumber === highlightedKey)?.coversHotelLegOrders
    if (!covering) return

    const points: [number, number][] = covering
      .map((order) => hotels.find((h) => h.order === order))
      .filter((h): h is Hotel & { lat: number; lon: number } => Boolean(h && h.lat !== null && h.lon !== null))
      .map((h) => [h.lat, h.lon])

    if (points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
  }, [map, highlightedKey, hotels, cars, flights])

  return null
}

const FLYTHROUGH_ZOOM = 8
const MIN_LEG_MS = 400
const MAX_LEG_MS = 3000
/** ms per degree of lat/lon travelled — tuned so typical inter-city hops
 *  (roughly 1-3 degrees) land near the middle of the clamp range. */
const MS_PER_DEGREE = 900

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function legDurationMs(a: [number, number], b: [number, number]): number {
  const distance = Math.hypot(a[0] - b[0], a[1] - b[1])
  return Math.min(MAX_LEG_MS, Math.max(MIN_LEG_MS, distance * MS_PER_DEGREE))
}

/** Animates a single marker along the full route (stop 1 -> 20 -> back to 1)
 *  at a fixed zoom, panning to keep it in view.
 *
 *  Play/stop, not restart: stopping (isPlaying -> false) only cancels the
 *  animation frame — the marker is left frozen exactly where it was, not
 *  removed. Playing again (isPlaying -> false -> true) removes that frozen
 *  marker first and starts fresh from stop 1; it never resumes mid-route.
 *  Reaching the end naturally calls the store's stop() itself so the button
 *  resets on its own instead of looping. */
function RouteFlythrough({ hotels, isPlaying }: { hotels: Hotel[]; isPlaying: boolean }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!isPlaying) return

    markerRef.current?.remove()
    markerRef.current = null

    const waypoints: [number, number][] = hotels
      .filter((h): h is Hotel & { lat: number; lon: number } => h.lat !== null && h.lon !== null)
      .sort((a, b) => a.order - b.order)
      .map((h) => [h.lat, h.lon])

    if (waypoints.length < 2) return

    const forward = waypoints
    const path = forward.concat([...forward].reverse().slice(1))
    const first = path[0]
    if (!first) return

    map.setView(first, FLYTHROUGH_ZOOM, { animate: false })
    const marker = L.marker(first, { icon: createFlythroughIcon(), interactive: false }).addTo(map)
    markerRef.current = marker

    let frameId: number
    let cancelled = false

    function runLeg(index: number) {
      if (cancelled) return
      const legStart = path[index]
      const legEnd = path[index + 1]
      if (!legStart || !legEnd) {
        // Reached the end naturally — stop on our own, don't loop.
        useRouteFlythroughStore.getState().stop()
        return
      }
      const start: [number, number] = legStart
      const end: [number, number] = legEnd
      const duration = legDurationMs(start, end)
      const startTime = performance.now()

      function tick(now: number) {
        if (cancelled) return
        const t = Math.min(1, (now - startTime) / duration)
        const eased = easeInOutQuad(t)
        const lat = start[0] + (end[0] - start[0]) * eased
        const lon = start[1] + (end[1] - start[1]) * eased
        marker.setLatLng([lat, lon])
        map.panTo([lat, lon], { animate: false })

        if (t < 1) {
          frameId = requestAnimationFrame(tick)
        } else {
          runLeg(index + 1)
        }
      }

      frameId = requestAnimationFrame(tick)
    }

    runLeg(0)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      // Deliberately not removing the marker here — stopping mid-tour
      // freezes it in place; the next play removes it before starting fresh.
    }
  }, [map, isPlaying, hotels])

  return null
}

export function TripMap({
  hotels,
  attractions,
  cars,
  flights,
  targetHotelOrder,
  targetAttractionName,
}: TripMapProps) {
  const hotelMarkerRefs = useRef(new Map<number, L.Marker>())
  const attractionMarkerRefs = useRef(new Map<string, L.Marker>())
  const isFlythroughPlaying = useRouteFlythroughStore((s) => s.isPlaying)

  const plottedPoints = useMemo<[number, number][]>(() => {
    const hotelPoints = hotels
      .filter((h): h is Hotel & { lat: number; lon: number } => h.lat !== null && h.lon !== null)
      .map((h): [number, number] => [h.lat, h.lon])
    const attractionPoints = attractions
      .filter((a): a is Attraction & { lat: number; lon: number } => a.lat !== null && a.lon !== null)
      .map((a): [number, number] => [a.lat, a.lon])
    return [...hotelPoints, ...attractionPoints]
  }, [hotels, attractions])

  if (plottedPoints.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
        טוען מפה…
      </div>
    )
  }

  return (
    <MapContainer
      center={plottedPoints[0]}
      zoom={7}
      className="isolate h-[60vh] w-full rounded-lg"
      scrollWheelZoom
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="מפת רחובות (Esri)">
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="לוויין (Esri)">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="CartoDB Positron">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <RouteSegments hotels={hotels} cars={cars} flights={flights} />
      {hotels.map((hotel) => (
        <HotelMarker
          key={hotel.order}
          hotel={hotel}
          registerRef={(order, marker) => {
            if (marker) hotelMarkerRefs.current.set(order, marker)
            else hotelMarkerRefs.current.delete(order)
          }}
        />
      ))}
      {attractions.map((attraction) => (
        <AttractionMarker
          key={attraction.name}
          attraction={attraction}
          registerRef={(name, marker) => {
            if (marker) attractionMarkerRefs.current.set(name, marker)
            else attractionMarkerRefs.current.delete(name)
          }}
        />
      ))}
      {/* Rendered after the markers so their popup-binding effects run first
          (effects commit bottom-up in JSX order) — otherwise openPopup()
          below can fire before react-leaflet has bound the popup. */}
      <FitBounds points={plottedPoints} skip={Boolean(targetHotelOrder || targetAttractionName)} />
      {targetHotelOrder && <FocusHotel targetOrder={targetHotelOrder} markerRefs={hotelMarkerRefs} />}
      {targetAttractionName && (
        <FocusAttraction targetName={targetAttractionName} markerRefs={attractionMarkerRefs} />
      )}
      <FitHighlightedSegment hotels={hotels} cars={cars} flights={flights} />
      <RouteFlythrough hotels={hotels} isPlaying={isFlythroughPlaying} />
    </MapContainer>
  )
}
