import { Fragment, useEffect } from "react"
import { Marker, Polyline } from "react-leaflet"
import { createSegmentEmojiIcon } from "@/components/map/icons"
import { LEAFLET_DASH_ARRAY, lineStyleForTransport } from "@/lib/geo"
import type { CarSummaryRow, FlightSummaryRow, TrainSummaryRow } from "@/lib/routeSummary"
import { useRouteColorStore } from "@/stores/route-color-store"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import type { RouteStop, TransportMode } from "@/types/trip"

const SEGMENT_EMOJI: Partial<Record<TransportMode, string>> = {
  car: "🚗",
  flight: "✈️",
  train: "🚄",
}

interface RouteSegmentsProps {
  hotels: RouteStop[]
  cars: CarSummaryRow[]
  flights: FlightSummaryRow[]
  trains: TrainSummaryRow[]
}

const HIGHLIGHT_COLOR = "#DC2626"

/** coversHotelLegOrders like [4,5,6] covers legs 4->5 and 5->6 — every order
 *  except the last is a "from" hotel of one of those legs. */
function highlightedFromOrders(
  cars: CarSummaryRow[],
  flights: FlightSummaryRow[],
  trains: TrainSummaryRow[],
  highlightedKey: string | null
): Set<number> {
  const orders = new Set<number>()
  if (!highlightedKey) return orders
  for (const car of cars) {
    if (car.key !== highlightedKey) continue
    for (const order of car.coversHotelLegOrders.slice(0, -1)) orders.add(order)
  }
  for (const flight of flights) {
    if (flight.key !== highlightedKey) continue
    for (const order of flight.coversHotelLegOrders.slice(0, -1)) orders.add(order)
  }
  for (const train of trains) {
    if (train.key !== highlightedKey) continue
    for (const order of train.coversHotelLegOrders.slice(0, -1)) orders.add(order)
  }
  return orders
}

export function RouteSegments({ hotels, cars, flights, trains }: RouteSegmentsProps) {
  const hotelsInOrder = [...hotels].sort((a, b) => a.order - b.order)
  const routeColor = useRouteColorStore((s) => s.color)
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const highlightedFrom = highlightedFromOrders(cars, flights, trains, highlightedKey)

  useEffect(() => {
    // Dev-time cross-check: coversHotelLegOrders on cars/flights should line
    // up with the transportToNext-driven segments actually drawn below.
    // transportToNext remains the source of truth for drawing either way.
    const checkLegs = (label: string, orders: number[], expectedMode: "car" | "flight" | "train") => {
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
    for (const train of trains) checkLegs(train.label, train.coversHotelLegOrders, "train")
  }, [hotelsInOrder, cars, flights, trains])

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
        const emoji = SEGMENT_EMOJI[hotel.transportToNext]
        const midpoint: [number, number] = [(hotel.lat + next.lat) / 2, (hotel.lon + next.lon) / 2]

        return (
          <Fragment key={hotel.order}>
            <Polyline
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
            {emoji && <Marker position={midpoint} icon={createSegmentEmojiIcon(emoji)} interactive={false} />}
          </Fragment>
        )
      })}
    </>
  )
}
