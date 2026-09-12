import L from "leaflet"
import { useEffect, useMemo, useRef } from "react"
import { LayersControl, MapContainer, TileLayer, useMap } from "react-leaflet"
import { AttractionMarker } from "@/components/map/AttractionMarker"
import { HotelMarker } from "@/components/map/HotelMarker"
import { RouteSegments } from "@/components/map/RouteSegments"
import { useMapFitStore } from "@/stores/map-fit-store"
import type { Attraction, CarLeg, FlightLeg, Hotel } from "@/types/trip"

interface TripMapProps {
  hotels: Hotel[]
  attractions: Attraction[]
  cars: CarLeg[]
  flights: FlightLeg[]
  targetHotelOrder?: number
  targetAttractionName?: string
}

function FitBounds({
  points,
  skipInitialFit,
}: {
  points: [number, number][]
  skipInitialFit: boolean
}) {
  const map = useMap()
  const requestId = useMapFitStore((s) => s.requestId)
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (points.length === 0) return
    if (isFirstRun.current) {
      isFirstRun.current = false
      if (skipInitialFit) return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
  }, [map, points, requestId, skipInitialFit])

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
      <FitBounds points={plottedPoints} skipInitialFit={Boolean(targetHotelOrder || targetAttractionName)} />
      {targetHotelOrder && <FocusHotel targetOrder={targetHotelOrder} markerRefs={hotelMarkerRefs} />}
      {targetAttractionName && (
        <FocusAttraction targetName={targetAttractionName} markerRefs={attractionMarkerRefs} />
      )}
    </MapContainer>
  )
}
