import L from "leaflet"
import { useEffect, useMemo, useRef } from "react"
import { LayersControl, MapContainer, TileLayer, useMap } from "react-leaflet"
import { AttractionMarker } from "@/components/map/AttractionMarker"
import { createFlythroughIcon } from "@/components/map/icons"
import { HotelMarker } from "@/components/map/HotelMarker"
import { RecommendationMarker } from "@/components/map/RecommendationMarker"
import { RouteSegments } from "@/components/map/RouteSegments"
import { MARKER_Z_MY_LOCATION } from "@/lib/mapZIndex"
import type { CarSummaryRow, FlightSummaryRow, TrainSummaryRow } from "@/lib/routeSummary"
import { useMapLayersStore } from "@/stores/map-layers-store"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import { useRouteFlythroughStore } from "@/stores/route-flythrough-store"
import type { Attraction, Hotel, Leg, Recommendation, RouteStop } from "@/types/trip"

interface TripMapProps {
  hotels: RouteStop[]
  /** Full private hotel details keyed by stop order, when the private trip
   *  file has been loaded — empty when running off route-public.json alone. */
  hotelDetailsByOrder: Map<number, Hotel>
  attractions: Attraction[]
  carSummaries: CarSummaryRow[]
  flightSummaries: FlightSummaryRow[]
  trainSummaries: TrainSummaryRow[]
  legs: Leg[]
  /** Stop we're currently at per today's date, when known (private trip
   *  file loaded) — highlights that hotel marker as "we are here". */
  currentHotelOrder?: number | null
  targetHotelOrder?: number
  targetAttractionName?: string
  targetRecommendation?: Recommendation
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

function FocusRecommendation({
  targetId,
  markerRefs,
}: {
  targetId: string | undefined
  markerRefs: React.RefObject<Map<string, L.Marker>>
}) {
  const map = useMap()
  useEffect(() => {
    if (!targetId) return
    const marker = markerRefs.current.get(targetId)
    if (!marker) return
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true })
    marker.openPopup()
  }, [map, markerRefs, targetId])
  return null
}

/** Zooms/pans to fit exactly the currently-highlighted car/flight's covered
 *  stops (all of coversHotelLegOrders, not just endpoints) — leaves the view
 *  untouched on deselect, per spec. */
function FitHighlightedSegment({
  hotels,
  cars,
  flights,
  trains,
}: {
  hotels: RouteStop[]
  cars: CarSummaryRow[]
  flights: FlightSummaryRow[]
  trains: TrainSummaryRow[]
}) {
  const map = useMap()
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)

  useEffect(() => {
    if (!highlightedKey) return
    const covering =
      cars.find((c) => c.key === highlightedKey)?.coversHotelLegOrders ??
      flights.find((f) => f.key === highlightedKey)?.coversHotelLegOrders ??
      trains.find((t) => t.key === highlightedKey)?.coversHotelLegOrders
    if (!covering) return

    const points: [number, number][] = covering
      .map((order) => hotels.find((h) => h.order === order))
      .filter((h): h is RouteStop & { lat: number; lon: number } => Boolean(h && h.lat !== null && h.lon !== null))
      .map((h) => [h.lat, h.lon])

    if (points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
  }, [map, highlightedKey, hotels, cars, flights, trains])

  return null
}

const CURRENT_STOP_ZOOM = 14
const LOCATE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>'

/** Top-right Leaflet control (added after the LayersControl, so it stacks
 *  right under it) that zooms in on the stop we're at per today's date.
 *  Falls back to stop 1 when the date-based stop isn't known (no private
 *  trip file loaded), matching getCurrentHotelOrder's own default. */
function ZoomToCurrentStopControl({
  hotels,
  currentHotelOrder,
  markerRefs,
}: {
  hotels: RouteStop[]
  currentHotelOrder: number | null | undefined
  markerRefs: React.RefObject<Map<number, L.Marker>>
}) {
  const map = useMap()
  const targetRef = useRef<{ hotels: RouteStop[]; order: number }>({ hotels, order: currentHotelOrder ?? 1 })
  useEffect(() => {
    targetRef.current = { hotels, order: currentHotelOrder ?? 1 }
  }, [hotels, currentHotelOrder])

  useEffect(() => {
    const control = new L.Control({ position: "topright" })
    control.onAdd = () => {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control")
      const button = L.DomUtil.create("a", "trip-map-control-button", container)
      button.href = "#"
      button.setAttribute("role", "button")
      button.title = "זום למיקום שלנו לפי התאריך"
      button.setAttribute("aria-label", button.title)
      button.innerHTML = LOCATE_ICON_SVG
      L.DomEvent.disableClickPropagation(container)
      L.DomEvent.on(button, "click", (e) => {
        L.DomEvent.preventDefault(e)
        const { hotels: stops, order } = targetRef.current
        const stop = stops.find((h) => h.order === order)
        if (!stop || stop.lat === null || stop.lon === null) return
        map.flyTo([stop.lat, stop.lon], CURRENT_STOP_ZOOM, { duration: 1.2 })
        const marker = markerRefs.current.get(order)
        if (marker) map.once("moveend", () => marker.openPopup())
      })
      return container
    }
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map, markerRefs])

  return null
}

const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
const ENTER_FULLSCREEN_ICON_SVG = `<svg ${SVG_ATTRS}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`
const EXIT_FULLSCREEN_ICON_SVG = `<svg ${SVG_ATTRS}><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`
const FULLSCREEN_CLASS = "trip-map--fullscreen"

/** Top-left Leaflet control (added after the built-in zoom control, so it
 *  stacks right under +/-) that toggles the map between its normal inline
 *  size and covering the whole viewport. CSS-based rather than the
 *  Fullscreen API, which iOS Safari doesn't support for non-video elements.
 *  Escape also exits. */
function FullscreenControl() {
  const map = useMap()

  useEffect(() => {
    const mapContainer = map.getContainer()
    let button: HTMLAnchorElement | null = null

    function render(isFullscreen: boolean) {
      if (!button) return
      button.title = isFullscreen ? "יציאה ממסך מלא" : "מפה במסך מלא"
      button.setAttribute("aria-label", button.title)
      button.setAttribute("aria-pressed", String(isFullscreen))
      button.innerHTML = isFullscreen ? EXIT_FULLSCREEN_ICON_SVG : ENTER_FULLSCREEN_ICON_SVG
    }

    function setFullscreen(isFullscreen: boolean) {
      mapContainer.classList.toggle(FULLSCREEN_CLASS, isFullscreen)
      document.body.style.overflow = isFullscreen ? "hidden" : ""
      render(isFullscreen)
      map.invalidateSize()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mapContainer.classList.contains(FULLSCREEN_CLASS)) setFullscreen(false)
    }

    const control = new L.Control({ position: "topleft" })
    control.onAdd = () => {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control")
      button = L.DomUtil.create("a", "trip-map-control-button", container)
      button.href = "#"
      button.setAttribute("role", "button")
      render(false)
      L.DomEvent.disableClickPropagation(container)
      L.DomEvent.on(button, "click", (e) => {
        L.DomEvent.preventDefault(e)
        setFullscreen(!mapContainer.classList.contains(FULLSCREEN_CLASS))
      })
      return container
    }
    control.addTo(map)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      mapContainer.classList.remove(FULLSCREEN_CLASS)
      document.body.style.overflow = ""
      control.remove()
    }
  }, [map])

  return null
}

const MY_LOCATION_ZOOM = 16
const MY_LOCATION_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>'

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "אין הרשאה למיקום. יש לאשר גישה למיקום בהגדרות הדפדפן."
    case error.TIMEOUT:
      return "לא הצלחנו לקבל מיקום בזמן. נסו שוב."
    default:
      return "המיקום לא זמין כרגע. נסו שוב."
  }
}

/** Top-right Leaflet control (added after the zoom-to-today's-stop control,
 *  so it stacks right under it) that asks the browser for the device's real
 *  position, drops a "you are here" dot with an accuracy circle, and flies
 *  in on it. One-shot per click, not continuous tracking, so the GPS isn't
 *  kept running in the background. */
function MyLocationControl() {
  const map = useMap()

  useEffect(() => {
    let dot: L.Marker | null = null
    let accuracyCircle: L.Circle | null = null
    let cancelled = false

    const control = new L.Control({ position: "topright" })
    control.onAdd = () => {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control")
      const button = L.DomUtil.create("a", "trip-map-control-button", container)
      button.href = "#"
      button.setAttribute("role", "button")
      button.title = "המיקום שלי"
      button.setAttribute("aria-label", button.title)
      button.innerHTML = MY_LOCATION_ICON_SVG
      L.DomEvent.disableClickPropagation(container)
      L.DomEvent.on(button, "click", (e) => {
        L.DomEvent.preventDefault(e)
        if (button.classList.contains("is-loading")) return
        if (!("geolocation" in navigator)) {
          window.alert("הדפדפן הזה לא תומך באיתור מיקום.")
          return
        }
        button.classList.add("is-loading")
        navigator.geolocation.getCurrentPosition(
          (position) => {
            button.classList.remove("is-loading")
            if (cancelled) return
            const latLng: [number, number] = [position.coords.latitude, position.coords.longitude]
            const accuracy = position.coords.accuracy

            if (accuracyCircle) accuracyCircle.setLatLng(latLng).setRadius(accuracy)
            else
              accuracyCircle = L.circle(latLng, {
                radius: accuracy,
                className: "trip-my-location-accuracy",
                interactive: false,
              }).addTo(map)

            if (dot) dot.setLatLng(latLng)
            else
              dot = L.marker(latLng, {
                icon: L.divIcon({ className: "trip-my-location-dot", iconSize: [18, 18] }),
                interactive: false,
                keyboard: false,
                zIndexOffset: MARKER_Z_MY_LOCATION,
              }).addTo(map)

            map.flyTo(latLng, Math.max(map.getZoom(), MY_LOCATION_ZOOM), { duration: 1.2 })
          },
          (error) => {
            button.classList.remove("is-loading")
            if (!cancelled) window.alert(geolocationErrorMessage(error))
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        )
      })
      return container
    }
    control.addTo(map)

    return () => {
      cancelled = true
      dot?.remove()
      accuracyCircle?.remove()
      control.remove()
    }
  }, [map])

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

/** Animates a single marker along the full route (stop 1 -> last stop, one
 *  way) at a fixed zoom, panning to keep it in view.
 *
 *  Play/stop, not restart: stopping (isPlaying -> false) only cancels the
 *  animation frame — the marker is left frozen exactly where it was, not
 *  removed. Playing again (isPlaying -> false -> true) removes that frozen
 *  marker first and starts fresh from stop 1; it never resumes mid-route.
 *  Reaching the end naturally calls the store's stop() itself so the button
 *  resets on its own instead of looping or reversing. */
function RouteFlythrough({ hotels, isPlaying }: { hotels: RouteStop[]; isPlaying: boolean }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!isPlaying) return

    markerRef.current?.remove()
    markerRef.current = null

    const waypoints: [number, number][] = hotels
      .filter((h): h is RouteStop & { lat: number; lon: number } => h.lat !== null && h.lon !== null)
      .sort((a, b) => a.order - b.order)
      .map((h) => [h.lat, h.lon])

    if (waypoints.length < 2) return

    const path = waypoints
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
  hotelDetailsByOrder,
  attractions,
  carSummaries,
  flightSummaries,
  trainSummaries,
  legs,
  currentHotelOrder,
  targetHotelOrder,
  targetAttractionName,
  targetRecommendation,
}: TripMapProps) {
  const hotelMarkerRefs = useRef(new Map<number, L.Marker>())
  const attractionMarkerRefs = useRef(new Map<string, L.Marker>())
  const recommendationMarkerRefs = useRef(new Map<string, L.Marker>())
  const isFlythroughPlaying = useRouteFlythroughStore((s) => s.isPlaying)
  const showHotels = useMapLayersStore((s) => s.hotels)
  const showAttractions = useMapLayersStore((s) => s.attractions)

  const plottedPoints = useMemo<[number, number][]>(() => {
    const hotelPoints = hotels
      .filter((h): h is RouteStop & { lat: number; lon: number } => h.lat !== null && h.lon !== null)
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
      <FullscreenControl />
      <ZoomToCurrentStopControl
        hotels={hotels}
        currentHotelOrder={currentHotelOrder}
        markerRefs={hotelMarkerRefs}
      />
      <MyLocationControl />
      <RouteSegments hotels={hotels} cars={carSummaries} flights={flightSummaries} trains={trainSummaries} legs={legs} />
      {showHotels &&
        hotels.map((stop) => (
          <HotelMarker
            key={stop.order}
            stop={stop}
            details={hotelDetailsByOrder.get(stop.order)}
            isCurrent={stop.order === currentHotelOrder}
            registerRef={(order, marker) => {
              if (marker) hotelMarkerRefs.current.set(order, marker)
              else hotelMarkerRefs.current.delete(order)
            }}
          />
        ))}
      {showAttractions &&
        attractions.map((attraction) => (
          <AttractionMarker
            key={attraction.name}
            attraction={attraction}
            registerRef={(name, marker) => {
              if (marker) attractionMarkerRefs.current.set(name, marker)
              else attractionMarkerRefs.current.delete(name)
            }}
          />
        ))}
      {targetRecommendation && (
        <RecommendationMarker
          recommendation={targetRecommendation}
          registerRef={(id, marker) => {
            if (marker) recommendationMarkerRefs.current.set(id, marker)
            else recommendationMarkerRefs.current.delete(id)
          }}
        />
      )}
      {/* Rendered after the markers so their popup-binding effects run first
          (effects commit bottom-up in JSX order) — otherwise openPopup()
          below can fire before react-leaflet has bound the popup. */}
      <FitBounds
        points={plottedPoints}
        skip={Boolean(targetHotelOrder || targetAttractionName || targetRecommendation)}
      />
      {targetHotelOrder && <FocusHotel targetOrder={targetHotelOrder} markerRefs={hotelMarkerRefs} />}
      {targetAttractionName && (
        <FocusAttraction targetName={targetAttractionName} markerRefs={attractionMarkerRefs} />
      )}
      {targetRecommendation && (
        <FocusRecommendation targetId={targetRecommendation.id} markerRefs={recommendationMarkerRefs} />
      )}
      <FitHighlightedSegment
        hotels={hotels}
        cars={carSummaries}
        flights={flightSummaries}
        trains={trainSummaries}
      />
      <RouteFlythrough hotels={hotels} isPlaying={isFlythroughPlaying} />
    </MapContainer>
  )
}
