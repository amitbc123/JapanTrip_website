import type L from "leaflet"
import { Marker, Popup } from "react-leaflet"
import { Link } from "react-router"
import { createHotelIcon } from "@/components/map/icons"
import { formatHebrewDateRange } from "@/lib/format"
import { translateCity } from "@/lib/translations"
import type { Hotel, RouteStop } from "@/types/trip"

interface HotelMarkerProps {
  stop: RouteStop
  /** Full private hotel details for this stop's order, when the private
   *  trip file has been loaded — upgrades the popup from a bare stop number
   *  to the name/city/date range. */
  details?: Hotel
  /** Whether this is the stop we're currently at, per today's date —
   *  only known once the private trip file is loaded. */
  isCurrent?: boolean
  registerRef?: (order: number, marker: L.Marker | null) => void
}

export function HotelMarker({ stop, details, isCurrent, registerRef }: HotelMarkerProps) {
  if (stop.lat === null || stop.lon === null) return null

  const dateRange =
    details?.checkIn && details?.checkOut
      ? formatHebrewDateRange(details.checkIn, details.checkOut)
      : null
  const srLabel = details
    ? `מלון ${stop.order}: ${details.name}, ${details.city}`
    : `תחנה ${stop.order}`

  return (
    <Marker
      position={[stop.lat, stop.lon]}
      icon={createHotelIcon(stop.order, srLabel, isCurrent)}
      ref={(marker) => registerRef?.(stop.order, marker)}
    >
      <Popup className="trip-map-popup">
        {details ? (
          <div className="flex min-w-40 flex-col gap-1 text-end">
            <div className="flex items-center justify-end gap-2">
              <span className="font-semibold">{details.name}</span>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {stop.order}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{translateCity(details.city)}</span>
            {dateRange && <span className="text-xs">{dateRange}</span>}
            {isCurrent && (
              <span className="text-xs font-semibold text-emerald-600">📍 נמצאים כאן עכשיו</span>
            )}
            <Link
              to={`/hotels?open=${stop.order}`}
              className="mt-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              פרטי המלון
            </Link>
          </div>
        ) : (
          <div className="flex min-w-24 flex-col items-end gap-1 text-end">
            <span className="font-semibold">תחנה {stop.order}</span>
          </div>
        )}
      </Popup>
    </Marker>
  )
}
