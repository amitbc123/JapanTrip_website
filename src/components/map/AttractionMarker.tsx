import { Marker, Popup } from "react-leaflet"
import { createAttractionIcon } from "@/components/map/icons"
import { formatHebrewDate } from "@/lib/format"
import { translateCity } from "@/lib/translations"
import type { Attraction } from "@/types/trip"

export function AttractionMarker({ attraction }: { attraction: Attraction }) {
  if (attraction.lat === null || attraction.lon === null) return null

  const srLabel = `אטרקציה: ${attraction.name}, ${attraction.city}`

  return (
    <Marker
      position={[attraction.lat, attraction.lon]}
      icon={createAttractionIcon(srLabel)}
    >
      <Popup className="trip-map-popup">
        <div className="flex min-w-40 flex-col gap-1 text-end">
          <span className="font-semibold">{attraction.name}</span>
          <span className="text-xs text-muted-foreground">{translateCity(attraction.city)}</span>
          <span className="text-xs">
            {formatHebrewDate(attraction.date, true)} · {attraction.entryTime}
          </span>
        </div>
      </Popup>
    </Marker>
  )
}
