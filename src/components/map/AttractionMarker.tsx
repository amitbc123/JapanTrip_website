import type L from "leaflet"
import { Marker, Popup } from "react-leaflet"
import { createAttractionIcon } from "@/components/map/icons"
import { formatHebrewDate } from "@/lib/format"
import { MARKER_Z_ATTRACTION } from "@/lib/mapZIndex"
import { translateCity } from "@/lib/translations"
import type { Attraction } from "@/types/trip"

interface AttractionMarkerProps {
  attraction: Attraction
  registerRef?: (name: string, marker: L.Marker | null) => void
}

export function AttractionMarker({ attraction, registerRef }: AttractionMarkerProps) {
  if (attraction.lat === null || attraction.lon === null) return null

  const srLabel = `אטרקציה: ${attraction.name}, ${attraction.city}`

  return (
    <Marker
      position={[attraction.lat, attraction.lon]}
      icon={createAttractionIcon(srLabel)}
      zIndexOffset={MARKER_Z_ATTRACTION}
      ref={(marker) => registerRef?.(attraction.name, marker)}
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
