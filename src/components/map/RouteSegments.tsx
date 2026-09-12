import { useEffect } from "react"
import { Polyline } from "react-leaflet"
import { LEAFLET_DASH_ARRAY, lineStyleForTransport } from "@/lib/geo"
import { useRouteColorStore } from "@/stores/route-color-store"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import type { CarLeg, FlightLeg, Hotel } from "@/types/trip"

interface RouteSegmentsProps {
  hotels: Hotel[]
  cars: CarLeg[]
  flights: FlightLeg[]
}

const HIGHLIGHT_COLOR = "#DC2626"

/** coversHotelLegOrders like [4,5,6] covers legs 4->5 and 5->6 — every order
 *  except the last is a "from" hotel of one of those legs. */
function highlightedFromOrders(
  cars: CarLeg[],
  flights: FlightLeg[],
  highlighted: Set<string>
): Set<number> {
  const orders = new Set<number>()
  for (const car of cars) {
    if (!highlighted.has(car.bookingNumber)) continue
    for (const order of car.coversHotelLegOrders.slice(0, -1)) orders.add(order)
  }
  for (const flight of flights) {
    if (!highlighted.has(flight.flightNumber)) continue
    for (const order of flight.coversHotelLegOrders.slice(0, -1)) orders.add(order)
  }
  return orders
}

export function RouteSegments({ hotels, cars, flights }: RouteSegmentsProps) {
  const hotelsInOrder = [...hotels].sort((a, b) => a.order - b.order)
  const routeColor = useRouteColorStore((s) => s.color)
  const highlighted = useRouteHighlightStore((s) => s.highlighted)
  const highlightedFrom = highlightedFromOrders(cars, flights, highlighted)

  useEffect(() => {
    // Dev-time cross-check: coversHotelLegOrders on cars/flights should line
    // up with the transportToNext-driven segments actually drawn below.
    // transportToNext remains the source of truth for drawing either way.
    const checkLegs = (label: string, orders: number[], expectedMode: "car" | "flight") => {
      for (let i = 0; i < orders.length - 1; i++) {
        const from = hotelsInOrder.find((h) => h.order === orders[i])
        if (from && from.transportToNext !== expectedMode) {
          console.warn(
            `${label}: expected hotel #${from.order} -> #${orders[i + 1]} to be "${expectedMode}", but transportToNext is "${from.transportToNext}"`
          )
        }
      }
    }
    for (const car of cars) checkLegs(car.label, car.coversHotelLegOrders, "car")
    for (const flight of flights) checkLegs(flight.label, flight.coversHotelLegOrders, "flight")
  }, [hotelsInOrder, cars, flights])

  return (
    <>
      {hotelsInOrder.map((hotel, i) => {
        const next = hotelsInOrder[i + 1]
        if (!next || !hotel.transportToNext) return null
        if (hotel.lat === null || hotel.lon === null || next.lat === null || next.lon === null) {
          return null
        }

        const style = lineStyleForTransport(hotel.transportToNext)
        const isHighlighted = highlightedFrom.has(hotel.order)
        return (
          <Polyline
            key={hotel.order}
            positions={[
              [hotel.lat, hotel.lon],
              [next.lat, next.lon],
            ]}
            pathOptions={{
              color: isHighlighted ? HIGHLIGHT_COLOR : routeColor,
              weight: isHighlighted ? 6 : 3,
              dashArray: LEAFLET_DASH_ARRAY[style],
              opacity: isHighlighted ? 1 : 0.85,
            }}
          />
        )
      })}
    </>
  )
}
