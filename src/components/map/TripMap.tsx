import L from "leaflet"
import { useEffect, useMemo, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import { AttractionMarker } from "@/components/map/AttractionMarker"
import { HotelMarker } from "@/components/map/HotelMarker"
import { RouteSegments } from "@/components/map/RouteSegments"
import type { Attraction, CarLeg, FlightLeg, Hotel } from "@/types/trip"

interface TripMapProps {
  hotels: Hotel[]
  attractions: Attraction[]
  cars: CarLeg[]
  flights: FlightLeg[]
  targetHotelOrder?: number
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
  }, [map, points])
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

export function TripMap({ hotels, attractions, cars, flights, targetHotelOrder }: TripMapProps) {
  const markerRefs = useRef(new Map<number, L.Marker>())

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
      <TileLayer
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
      />
      <RouteSegments hotels={hotels} cars={cars} flights={flights} />
      {hotels.map((hotel) => (
        <HotelMarker
          key={hotel.order}
          hotel={hotel}
          registerRef={(order, marker) => {
            if (marker) markerRefs.current.set(order, marker)
            else markerRefs.current.delete(order)
          }}
        />
      ))}
      {attractions.map((attraction) => (
        <AttractionMarker key={attraction.name} attraction={attraction} />
      ))}
      {/* Rendered after the markers so their popup-binding effects run first
          (effects commit bottom-up in JSX order) — otherwise openPopup()
          below can fire before react-leaflet has bound the popup. */}
      {targetHotelOrder ? (
        <FocusHotel targetOrder={targetHotelOrder} markerRefs={markerRefs} />
      ) : (
        <FitBounds points={plottedPoints} />
      )}
    </MapContainer>
  )
}
