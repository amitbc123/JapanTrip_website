import { Fragment, useEffect, useMemo } from "react"
import { Marker, Polyline } from "react-leaflet"
import { createSegmentEmojiIcon } from "@/components/map/icons"
import { WaypointMarker } from "@/components/map/WaypointMarker"
import { carBookingId, flightBookingId, trainBookingId } from "@/components/map/TransportSummary"
import { LEAFLET_DASH_ARRAY, lineStyleForTransport } from "@/lib/geo"
import type { CarSummaryRow, FlightSummaryRow, TrainSummaryRow } from "@/lib/routeSummary"
import { groupWaypoints } from "@/lib/waypointGroups"
import { waypointModeForHotelTransport, WAYPOINT_MODE_STYLE } from "@/lib/waypointStyle"
import { useBookingStatusStore, effectiveStatus } from "@/stores/booking-status-store"
import { useRouteColorStore } from "@/stores/route-color-store"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"
import { useWaypointsVisibilityStore } from "@/stores/waypoints-visibility-store"
import type { Leg, LegWaypoint, RouteStop, TransportMode } from "@/types/trip"

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

export function RouteSegments({ hotels, cars, flights, trains, legs }: RouteSegmentsProps) {
  const hotelsInOrder = [...hotels].sort((a, b) => a.order - b.order)
  const routeColor = useRouteColorStore((s) => s.color)
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const highlightedFrom = highlightedFromOrders(cars, flights, trains, highlightedKey)
  const showWaypoints = useWaypointsVisibilityStore((s) => s.showWaypoints)
  const statusEntries = useBookingStatusStore((s) => s.entries)

  const legByHotelPair = useMemo(() => {
    const map = new Map<string, Leg>()
    for (const leg of legs) {
      if (leg.from === leg.to) continue
      map.set(`${leg.from}-${leg.to}`, leg)
    }
    return map
  }, [legs])

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
        const leg = legByHotelPair.get(`${hotel.order}-${next.order}`)

        if (showWaypoints && leg && leg.waypoints.length > 0) {
          const resolvedWaypoints = leg.waypoints.filter(
            (w): w is LegWaypoint & { lat: number; lon: number } => w.lat !== null && w.lon !== null
          )
          if (resolvedWaypoints.length === leg.waypoints.length) {
            const points: [number, number][] = [
              [hotel.lat, hotel.lon],
              ...resolvedWaypoints.map((w): [number, number] => [w.lat, w.lon]),
              [next.lat, next.lon],
            ]
            const firstMode = waypointModeForHotelTransport(hotel.transportToNext)
            const modes = [firstMode, ...resolvedWaypoints.map((w) => w.mode)]

            return (
              <Fragment key={hotel.order}>
                {points.slice(0, -1).map((point, segIndex) => {
                  const segEnd = points[segIndex + 1]
                  if (!segEnd) return null
                  const mode = modes[segIndex] ?? firstMode
                  const style = WAYPOINT_MODE_STYLE[mode]
                  return (
                    <Polyline
                      key={segIndex}
                      positions={[point, segEnd]}
                      pathOptions={{
                        color: isHighlighted ? HIGHLIGHT_COLOR : style.color,
                        weight: isHighlighted ? 6 : style.weight,
                        dashArray: style.dashArray,
                        opacity: isHighlighted ? 1 : 0.9,
                      }}
                    />
                  )
                })}
              </Fragment>
            )
          }
        }

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
            {emoji && <Marker position={midpoint} icon={createSegmentEmojiIcon(emoji, isDone)} interactive={false} />}
          </Fragment>
        )
      })}
      {showWaypoints && waypointGroups.map((group) => <WaypointMarker key={group.key} group={group} />)}
    </>
  )
}
