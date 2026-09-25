import type L from "leaflet"
import { Marker, Popup } from "react-leaflet"
import { MapPinnedIcon } from "lucide-react"
import { Link } from "react-router"
import { createHotelIcon } from "@/components/map/icons"
import { formatHebrewDateRange } from "@/lib/format"
import { formatNights, type HotelStay } from "@/lib/hotelStay"
import { MARKER_Z_HOTEL } from "@/lib/mapZIndex"
import { translateCity } from "@/lib/translations"
import type { Hotel, RouteStop } from "@/types/trip"

interface HotelMarkerProps {
  stop: RouteStop
  /** Full private hotel details for this stop's order, when the private
   *  trip file has been loaded — upgrades the popup from a bare stop number
   *  to the name/city/date range. */
  details?: Hotel
  /** This stop's dates and night count — own booking dates, or inferred
   *  from the neighbouring stops when the booking lacks them. */
  stay?: HotelStay
  /** Whether this is the stop we're currently at, per today's date —
   *  only known once the private trip file is loaded. */
  isCurrent?: boolean
  registerRef?: (order: number, marker: L.Marker | null) => void
}

/** Google's cross-platform Maps URL: opens the Google Maps app when it's
 *  installed (Android/iOS), the website otherwise, with a pin on the exact
 *  coordinates. */
function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

function OpenInGoogleMapsLink({ lat, lon }: { lat: number; lon: number }) {
  return (
    <a
      href={googleMapsUrl(lat, lon)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="פתיחה ב-Google Maps"
      className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground! no-underline! hover:bg-accent/40"
    >
      <MapPinnedIcon className="size-3.5" aria-hidden />
      Google Maps
    </a>
  )
}

export function HotelMarker({ stop, details, stay, isCurrent, registerRef }: HotelMarkerProps) {
  if (stop.lat === null || stop.lon === null) return null

  const dateRange =
    stay?.checkIn && stay.checkOut ? formatHebrewDateRange(stay.checkIn, stay.checkOut) : null
  const srLabel = details
    ? `מלון ${stop.order}: ${details.name}, ${details.city}`
    : `תחנה ${stop.order}`

  return (
    <Marker
      position={[stop.lat, stop.lon]}
      icon={createHotelIcon(stop.order, srLabel, isCurrent)}
      zIndexOffset={MARKER_Z_HOTEL}
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
            {stay && (
              <span className="text-xs">
                <span className="font-semibold">{formatNights(stay.nights)}</span>
                {" · "}
                {dateRange ?? "תאריכים טרם נקבעו"}
              </span>
            )}
            {stay?.estimated && dateRange && (
              <span className="text-[11px] text-muted-foreground">
                תאריכים משוערים לפי התחנות הסמוכות
              </span>
            )}
            {isCurrent && (
              <span className="text-xs font-semibold text-emerald-600">📍 נמצאים כאן עכשיו</span>
            )}
            <div className="mt-1 flex items-center justify-end gap-3">
              <Link
                to={`/hotels?open=${stop.order}`}
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                פרטי המלון
              </Link>
              {/* The private file's coordinates are the exact booked address;
                  route-public.json's can be station-area approximations. */}
              <OpenInGoogleMapsLink lat={details.lat ?? stop.lat} lon={details.lon ?? stop.lon} />
            </div>
          </div>
        ) : (
          <div className="flex min-w-24 flex-col items-end gap-1 text-end">
            <span className="font-semibold">תחנה {stop.order}</span>
            <div className="mt-1">
              <OpenInGoogleMapsLink lat={stop.lat} lon={stop.lon} />
            </div>
          </div>
        )}
      </Popup>
    </Marker>
  )
}
