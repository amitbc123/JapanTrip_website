import { Fragment, useMemo, useEffect } from "react"
import { Marker, Polyline } from "react-leaflet"
import { createSegmentEmojiIcon } from "@/components/map/icons"
import { carBookingId, flightBookingId, trainBookingId } from "@/components/map/TransportSummary"
import { WaypointMarker } from "@/components/map/WaypointMarker"
import { LEAFLET_DASH_ARRAY, lineStyleForTransport } from "@/lib/geo"
import { MARKER_Z_TRANSPORT_ICON } from "@/lib/mapZIndex"
import type { CarSummaryRow, FlightSummaryRow, TrainSummaryRow } from "@/lib/routeSummary"
import { groupWaypoints } from "@/lib/waypointGroups"
import { useBookingStatusStore, effectiveStatus } from "@/stores/booking-status-store"
import { useMapLayersStore } from "@/stores/map-layers-store"
import { useRouteColorStore } from "@/stores/route-color-store"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import type { Leg, RouteStop, TransportMode } from "@/types/trip"

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
  legs: Leg[]
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

/** The main hotel-to-hotel route is always drawn as a single straight line
 *  per pair, styled only by the coarse transportToNext mode — this never
 *  changes shape or color when waypoints are toggled. Leg/waypoint data
 *  (real intermediate stations, often well off the straight line) is shown
 *  purely as an additional marker layer on top, never by reshaping or
 *  recoloring the route itself — otherwise the route visibly jumps between
 *  two different paths depending on a display toggle, and the many short,
 *  oddly-angled segments a station detour produces at country-wide zoom
 *  read as a broken/glitchy line rather than a route. */
export function RouteSegments({ hotels, cars, flights, trains, legs }: RouteSegmentsProps) {
  const hotelsInOrder = [...hotels].sort((a, b) => a.order - b.order)
  const routeColor = useRouteColorStore((s) => s.color)
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const highlightedFrom = highlightedFromOrders(cars, flights, trains, highlightedKey)
  const showWaypoints = useMapLayersStore((s) => s.waypoints)
  const showTransportIcons = useMapLayersStore((s) => s.transportIcons)
  const statusEntries = useBookingStatusStore((s) => s.entries)

  const waypointGroups = useMemo(() => groupWaypoints(legs), [legs])

  const doneOrders = useMemo(() => {
    const orders = new Set<number>()
    for (const car of cars) {
      if (effectiveStatus(statusEntries[carBookingId(car.key)], true) !== "done") continue
      for (const order of car.coversHotelLegOrders.slice(0, -1)) orders.add(order)
    }
    for (const flight of flights) {
      if (effectiveStatus(statusEntries[flightBookingId(flight.key)], true) !== "done") continue
      for (const order of flight.coversHotelLegOrders.slice(0, -1)) orders.add(order)
    }
    for (const train of trains) {
      if (effectiveStatus(statusEntries[trainBookingId(train.key)], train.isBooked) !== "done") continue
      for (const order of train.coversHotelLegOrders.slice(0, -1)) orders.add(order)
    }
    return orders
  }, [cars, flights, trains, statusEntries])

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

        const isHighlighted = highlightedFrom.has(hotel.order)
        const isDone = doneOrders.has(hotel.order)
        const style = lineStyleForTransport(hotel.transportToNext)
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
            {emoji && showTransportIcons && (
              <Marker
                position={midpoint}
                icon={createSegmentEmojiIcon(emoji, isDone)}
                interactive={false}
                zIndexOffset={MARKER_Z_TRANSPORT_ICON}
              />
            )}
          </Fragment>
        )
      })}
      {showWaypoints && waypointGroups.map((group) => <WaypointMarker key={group.key} group={group} />)}
    </>
  )
}
