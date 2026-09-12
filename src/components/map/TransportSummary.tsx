import { CarIcon, PlaneIcon } from "lucide-react"
import { formatHebrewDate } from "@/lib/format"
import {
  translateCarDropoffLocation,
  translateCarLabel,
  translateCarPickupLocation,
  translateFlightRoute,
} from "@/lib/translations"
import type { CarLeg, FlightLeg } from "@/types/trip"

export function TransportSummary({ cars, flights }: { cars: CarLeg[]; flights: FlightLeg[] }) {
  return (
    <div className="flex flex-col gap-3">
      {cars.map((car) => (
        <div key={car.bookingNumber} className="flex gap-3 rounded-lg border border-border bg-card p-3">
          <CarIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">
              {translateCarLabel(car.bookingNumber)} · {car.model}
            </span>
            <span className="text-xs text-muted-foreground">
              איסוף: {translateCarPickupLocation(car.bookingNumber, car.pickup.location)},{" "}
              {formatHebrewDate(car.pickup.date)} {car.pickup.time}
            </span>
            <span className="text-xs text-muted-foreground">
              החזרה: {translateCarDropoffLocation(car.bookingNumber, car.dropoff.location)},{" "}
              {formatHebrewDate(car.dropoff.date)} {car.dropoff.time}
            </span>
          </div>
        </div>
      ))}
      {flights.map((flight) => (
        <div key={flight.flightNumber} className="flex gap-3 rounded-lg border border-border bg-card p-3">
          <PlaneIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">
              טיסה פנימית · {flight.flightNumber} · {translateFlightRoute(flight.flightNumber, flight.route)}
            </span>
            <span className="text-xs text-muted-foreground">
              המראה: {formatHebrewDate(flight.date)} {flight.departTime} · נחיתה: {flight.arriveTime}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
