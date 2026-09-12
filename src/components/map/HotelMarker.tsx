import type L from "leaflet"
import { Marker, Popup } from "react-leaflet"
import { Link } from "react-router"
import { createHotelIcon } from "@/components/map/icons"
import { formatHebrewDateRange } from "@/lib/format"
import { translateCity } from "@/lib/translations"
import type { Hotel } from "@/types/trip"

interface HotelMarkerProps {
  hotel: Hotel
  registerRef?: (order: number, marker: L.Marker | null) => void
}

export function HotelMarker({ hotel, registerRef }: HotelMarkerProps) {
  if (hotel.lat === null || hotel.lon === null) return null

  const dateRange =
    hotel.checkIn && hotel.checkOut ? formatHebrewDateRange(hotel.checkIn, hotel.checkOut) : null
  const srLabel = `מלון ${hotel.order}: ${hotel.name}, ${hotel.city}`

  return (
    <Marker
      position={[hotel.lat, hotel.lon]}
      icon={createHotelIcon(hotel.order, srLabel)}
      ref={(marker) => registerRef?.(hotel.order, marker)}
    >
      <Popup className="trip-map-popup">
        <div className="flex min-w-40 flex-col gap-1 text-end">
          <div className="flex items-center justify-end gap-2">
            <span className="font-semibold">{hotel.name}</span>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {hotel.order}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{translateCity(hotel.city)}</span>
          {dateRange && <span className="text-xs">{dateRange}</span>}
          <Link
            to={`/hotels?open=${hotel.order}`}
            className="mt-1 text-xs font-medium text-primary underline underline-offset-2"
          >
            פרטי המלון
          </Link>
        </div>
      </Popup>
    </Marker>
  )
}
