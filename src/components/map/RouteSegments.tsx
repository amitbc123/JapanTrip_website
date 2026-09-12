import { useEffect } from "react"
import { Polyline } from "react-leaflet"
import { LEAFLET_DASH_ARRAY, lineStyleForTransport } from "@/lib/geo"
import type { CarLeg, FlightLeg, Hotel } from "@/types/trip"

interface RouteSegmentsProps {
  hotels: Hotel[]
  cars: CarLeg[]
  flights: FlightLeg[]
}

export function RouteSegments({ hotels, cars, flights }: RouteSegmentsProps) {
  const hotelsInOrder = [...hotels].sort((a, b) => a.order - b.order)

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
        return (
          <Polyline
            key={hotel.order}
            positions={[
              [hotel.lat, hotel.lon],
              [next.lat, next.lon],
            ]}
            pathOptions={{
              color: "#d9622b",
              weight: 3,
              dashArray: LEAFLET_DASH_ARRAY[style],
              opacity: 0.85,
            }}
          />
        )
      })}
    </>
  )
}
