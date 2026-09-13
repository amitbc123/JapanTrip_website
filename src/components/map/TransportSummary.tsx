import { CarIcon, PlaneIcon } from "lucide-react"
import type { CarSummaryRow, FlightSummaryRow } from "@/lib/routeSummary"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"

function scrollMapIntoView() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

export function TransportSummary({
  cars,
  flights,
}: {
  cars: CarSummaryRow[]
  flights: FlightSummaryRow[]
}) {
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const toggle = useRouteHighlightStore((s) => s.toggle)

  function handleToggle(key: string) {
    const turnedOn = toggle(key)
    if (turnedOn) scrollMapIntoView()
  }

  return (
    <div className="flex flex-col gap-3">
      {cars.map((car) => {
        const isOn = highlightedKey === car.key
        return (
          <button
            key={car.key}
            type="button"
            aria-pressed={isOn}
            onClick={() => handleToggle(car.key)}
            className={`flex gap-3 rounded-lg border p-3 text-start transition-colors ${
              isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
            }`}
          >
            <CarIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium">{car.label}</span>
              <span className="text-[13px] text-muted-foreground">{car.pickupLine}</span>
              <span className="text-[13px] text-muted-foreground">{car.dropoffLine}</span>
            </div>
          </button>
        )
      })}
      {flights.map((flight) => {
        const isOn = highlightedKey === flight.key
        return (
          <button
            key={flight.key}
            type="button"
            aria-pressed={isOn}
            onClick={() => handleToggle(flight.key)}
            className={`flex gap-3 rounded-lg border p-3 text-start transition-colors ${
              isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
            }`}
          >
            <PlaneIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium">{flight.label}</span>
              <span className="text-[13px] text-muted-foreground">{flight.timeLine}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
