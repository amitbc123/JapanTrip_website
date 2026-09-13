import { CarIcon, PlaneIcon } from "lucide-react"
import { formatHebrewDate } from "@/lib/format"
import {
  translateCarDropoffLocation,
  translateCarLabel,
  translateCarPickupLocation,
  translateFlightRoute,
} from "@/lib/translations"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import type { CarLeg, FlightLeg } from "@/types/trip"

function scrollMapIntoView() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

export function TransportSummary({ cars, flights }: { cars: CarLeg[]; flights: FlightLeg[] }) {
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const toggle = useRouteHighlightStore((s) => s.toggle)

  function handleToggle(key: string) {
    const turnedOn = toggle(key)
    if (turnedOn) scrollMapIntoView()
  }

  return (
    <div className="flex flex-col gap-3">
      {cars.map((car) => {
        const isOn = highlightedKey === car.bookingNumber
        return (
          <button
            key={car.bookingNumber}
            type="button"
            aria-pressed={isOn}
            onClick={() => handleToggle(car.bookingNumber)}
            className={`flex gap-3 rounded-lg border p-3 text-start transition-colors ${
              isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
            }`}
          >
            <CarIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium">
                {translateCarLabel(car.bookingNumber)} · {car.model}
              </span>
              <span className="text-[13px] text-muted-foreground">
                איסוף: {translateCarPickupLocation(car.bookingNumber, car.pickup.location)},{" "}
                {formatHebrewDate(car.pickup.date)} {car.pickup.time}
              </span>
              <span className="text-[13px] text-muted-foreground">
                החזרה: {translateCarDropoffLocation(car.bookingNumber, car.dropoff.location)},{" "}
                {formatHebrewDate(car.dropoff.date)} {car.dropoff.time}
              </span>
            </div>
          </button>
        )
      })}
      {flights.map((flight) => {
        const isOn = highlightedKey === flight.flightNumber
        return (
          <button
            key={flight.flightNumber}
            type="button"
            aria-pressed={isOn}
            onClick={() => handleToggle(flight.flightNumber)}
            className={`flex gap-3 rounded-lg border p-3 text-start transition-colors ${
              isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
            }`}
          >
            <PlaneIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium">
                טיסה פנימית · {flight.flightNumber} ·{" "}
                {translateFlightRoute(flight.flightNumber, flight.route)}
              </span>
              <span className="text-[13px] text-muted-foreground">
                המראה: {formatHebrewDate(flight.date)} {flight.departTime} · נחיתה: {flight.arriveTime}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
