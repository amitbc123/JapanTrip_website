import { CarIcon, PlaneIcon, TrainFrontIcon } from "lucide-react"
import { type KeyboardEvent, useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookingStatusControl } from "@/components/common/BookingStatusControl"
import type { CarSummaryRow, FlightSummaryRow, TrainSummaryRow } from "@/lib/routeSummary"
import { effectiveStatus, useBookingStatusStore } from "@/stores/booking-status-store"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import type { BookingStatusValue } from "@/types/bookingStatus"

function bySortKey<T extends { sortKey: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

function scrollMapIntoView() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

/** The card itself toggles the map highlight and needs to stay keyboard
 *  operable, but it also contains the (real) buttons of BookingStatusControl
 *  — a <button> can't nest another <button>, so it's a div with button
 *  semantics instead. */
function handleCardKeyDown(e: KeyboardEvent, onActivate: () => void) {
  if (e.key !== "Enter" && e.key !== " ") return
  e.preventDefault()
  onActivate()
}

export function trainBookingId(key: string): string {
  return `train:${key}`
}
export function carBookingId(key: string): string {
  return `car:${key}`
}
export function flightBookingId(key: string): string {
  return `flight:${key}`
}

type Filter = "all" | "open" | "done"

const FILTER_LABEL: Record<Filter, string> = {
  all: "הכל",
  open: "טרם הוזמן",
  done: "בוצע",
}

export function TransportSummary({
  cars,
  flights,
  trains,
  travelers,
}: {
  cars: CarSummaryRow[]
  flights: FlightSummaryRow[]
  trains: TrainSummaryRow[]
  travelers?: string[]
}) {
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const toggle = useRouteHighlightStore((s) => s.toggle)
  const statusEntries = useBookingStatusStore((s) => s.entries)
  const [filter, setFilter] = useState<Filter>("all")

  function handleToggle(key: string) {
    const turnedOn = toggle(key)
    if (turnedOn) scrollMapIntoView()
  }

  const statuses = useMemo(() => {
    const map = new Map<string, BookingStatusValue>()
    for (const train of trains) map.set(train.key, effectiveStatus(statusEntries[trainBookingId(train.key)], train.isBooked))
    for (const car of cars) map.set(car.key, effectiveStatus(statusEntries[carBookingId(car.key)], true))
    for (const flight of flights) map.set(flight.key, effectiveStatus(statusEntries[flightBookingId(flight.key)], true))
    return map
  }, [trains, cars, flights, statusEntries])

  // Each category collapses on its own (collapsed by default) and is sorted
  // by date/time internally — grouping by transport type keeps the list from
  // growing unwieldy as more legs get added, without losing chronological
  // order within a category.
  const sortedTrains = useMemo(() => bySortKey(trains), [trains])
  const sortedCars = useMemo(() => bySortKey(cars), [cars])
  const sortedFlights = useMemo(() => bySortKey(flights), [flights])

  const total = trains.length + cars.length + flights.length
  const doneCount = [...statuses.values()].filter((s) => s === "done").length

  function passesFilter(key: string): boolean {
    if (filter === "all") return true
    const status = statuses.get(key)
    return filter === "done" ? status === "done" : status !== "done"
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-[13px] font-medium">
          {doneCount} מתוך {total} הזמנות בוצעו
        </span>
        <div className="flex gap-1">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`h-7 rounded-full border px-2.5 text-xs font-medium ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <Accordion type="multiple" className="flex flex-col gap-3">
        {sortedTrains.length > 0 && (
          <AccordionItem value="trains" className="rounded-lg border border-border bg-card px-3">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <TrainFrontIcon className="size-4 shrink-0 text-primary" aria-hidden />
                רכבות · {sortedTrains.filter((t) => passesFilter(t.key)).length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                {sortedTrains.filter((t) => passesFilter(t.key)).map((train) => {
                  const isOn = highlightedKey === train.key
                  return (
                    <div
                      key={train.key}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isOn}
                      onClick={() => handleToggle(train.key)}
                      onKeyDown={(e) => handleCardKeyDown(e, () => handleToggle(train.key))}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-start transition-colors ${
                        isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
                      }`}
                    >
                      <TrainFrontIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[15px] font-medium">{train.label}</span>
                          <BookingStatusControl id={trainBookingId(train.key)} defaultBooked={train.isBooked} travelers={travelers} />
                        </div>
                        <span className="text-[13px] text-muted-foreground">{train.timeLine}</span>
                        {train.paidByLine && (
                          <span className="text-[13px] text-muted-foreground">{train.paidByLine}</span>
                        )}
                        {train.notes && <span className="text-[13px] text-destructive">{train.notes}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {sortedCars.length > 0 && (
          <AccordionItem value="cars" className="rounded-lg border border-border bg-card px-3">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <CarIcon className="size-4 shrink-0 text-primary" aria-hidden />
                רכבים · {sortedCars.filter((c) => passesFilter(c.key)).length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                {sortedCars.filter((c) => passesFilter(c.key)).map((car) => {
                  const isOn = highlightedKey === car.key
                  return (
                    <div
                      key={car.key}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isOn}
                      onClick={() => handleToggle(car.key)}
                      onKeyDown={(e) => handleCardKeyDown(e, () => handleToggle(car.key))}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-start transition-colors ${
                        isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
                      }`}
                    >
                      <CarIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[15px] font-medium">{car.label}</span>
                          <BookingStatusControl id={carBookingId(car.key)} defaultBooked travelers={travelers} />
                        </div>
                        <span className="text-[13px] text-muted-foreground">{car.pickupLine}</span>
                        <span className="text-[13px] text-muted-foreground">{car.dropoffLine}</span>
                        {car.notes && <span className="text-[13px] text-destructive">{car.notes}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {sortedFlights.length > 0 && (
          <AccordionItem value="flights" className="rounded-lg border border-border bg-card px-3">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <PlaneIcon className="size-4 shrink-0 text-primary" aria-hidden />
                טיסות · {sortedFlights.filter((f) => passesFilter(f.key)).length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                {sortedFlights.filter((f) => passesFilter(f.key)).map((flight) => {
                  const isOn = highlightedKey === flight.key
                  return (
                    <div
                      key={flight.key}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isOn}
                      onClick={() => handleToggle(flight.key)}
                      onKeyDown={(e) => handleCardKeyDown(e, () => handleToggle(flight.key))}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-start transition-colors ${
                        isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"
                      }`}
                    >
                      <PlaneIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[15px] font-medium">{flight.label}</span>
                          <BookingStatusControl id={flightBookingId(flight.key)} defaultBooked travelers={travelers} />
                        </div>
                        <span className="text-[13px] text-muted-foreground">{flight.timeLine}</span>
                        {flight.notes && <span className="text-[13px] text-destructive">{flight.notes}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
