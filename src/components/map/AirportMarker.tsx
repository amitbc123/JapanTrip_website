import type L from "leaflet"
import { Marker, Popup } from "react-leaflet"
import { createAirportIcon } from "@/components/map/icons"
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink"
import { MARKER_Z_AIRPORT } from "@/lib/mapZIndex"
import type { Airport } from "@/types/trip"

export function AirportMarker({
  airport,
  registerRef,
}: {
  airport: Airport
  registerRef?: (id: string, marker: L.Marker | null) => void
}) {
  return (
    <Marker
      position={[airport.lat, airport.lon]}
      icon={createAirportIcon(airport.nameHe)}
      zIndexOffset={MARKER_Z_AIRPORT}
      ref={(marker) => registerRef?.(airport.id, marker)}
    >
      <Popup className="trip-map-popup">
        <div className="flex min-w-40 flex-col items-end gap-1 text-end">
          <span className="font-semibold">{airport.nameHe}</span>
          <span className="text-xs text-muted-foreground">{airport.name}</span>
          {airport.note && <span className="text-xs">{airport.note}</span>}
          <div className="mt-1">
            <OpenInGoogleMapsLink lat={airport.lat} lon={airport.lon} />
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
