import type { BookingStatusMap } from "@/types/bookingStatus"

export type TransportMode = "train" | "car" | "flight"

export interface Price {
  amount: number
  currency: "JPY" | "USD" | "ILS"
  approxILS?: number
  approxJPY?: number
  note?: string
}

export interface Hotel {
  order: number
  name: string
  nameLocal?: string
  city: string
  checkIn: string | null
  checkOut: string | null
  nights: number
  address: string | null
  phone: string | null
  confirmationNumber: string | null
  pinCode?: string
  price: Price | null
  lat: number | null
  lon: number | null
  geocode: boolean
  geocodeQuery?: string
  transportToNext: TransportMode | null
  notes: string | null
}

export interface Attraction {
  name: string
  city: string
  date: string
  entryTime: string
  confirmationNumber: string | null
  voucherNumber?: string
  price: Price | null
  address: string | null
  lat: number | null
  lon: number | null
  geocode: boolean
  geocodeQuery?: string
  notes: string | null
}

export interface CarLeg {
  label: string
  model: string
  bookingNumber: string
  provider?: string
  pickup: { location: string; date: string; time: string; phone?: string }
  dropoff: { location: string; date: string; time: string; phone?: string }
  coversHotelLegOrders: number[]
  notes?: string
}

export interface FlightLeg {
  label: string
  flightNumber: string
  route: string
  date: string
  departTime: string
  arriveTime: string
  bookingReference: string
  seats: string[]
  coversHotelLegOrders: number[]
}

/** route-public.json's train shape — trains are sourced from the site's
 *  own data only, never from the private trip file. Deliberately carries
 *  no price/paidBy: those are financial/personal details that don't belong
 *  in the committed public file, see `PrivateTrainInfo` below.
 *
 *  departTime/arriveTime are null only when no candidate schedule is known
 *  yet at all — once a specific service is identified (even before it's
 *  actually purchased), the schedule is filled in and `booked` alone tracks
 *  whether the ticket itself has been bought. */
export interface TrainLeg {
  label: string
  trainNumber: string
  route: string
  date: string
  departTime: string | null
  arriveTime: string | null
  booked: boolean
  coversHotelLegOrders: number[]
  notes?: string
}

/** Private-only financial details for a route-public.json train leg,
 *  matched back to it by `trainNumber` — lives only in the private trip
 *  file so price and who-paid never end up in the repo. */
export interface PrivateTrainInfo {
  trainNumber: string
  price: Price | null
  paidBy: string | null
  seats?: string[]
}

export interface TripData {
  tripDates: { start: string; end: string }
  travelers: string[]
  hotels: Hotel[]
  attractions: Attraction[]
  cars: CarLeg[]
  flights: FlightLeg[]
  trains?: PrivateTrainInfo[]
  /** Booking-status-store's state, folded into the same file on export so a
   *  single "טעינת קובץ חדש" restores both the trip data and every
   *  status/price/note — never round-tripped as a separate file. */
  bookingStatus?: BookingStatusMap
}

/** The subset of a route stop that's safe to show without the private trip
 *  file loaded — order/coordinates/transport mode only, no name or dates.
 *  `Hotel` already structurally satisfies this. */
export interface RouteStop {
  order: number
  lat: number | null
  lon: number | null
  transportToNext: TransportMode | null
}

/** route-public.json's car shape — city-level pickup/dropoff only, no
 *  booking number, phone, or model. */
export interface PublicCarLeg {
  label: string
  pickupCity: string
  pickupDate: string
  pickupTime: string
  dropoffCity: string
  dropoffDate: string
  dropoffTime: string
  coversHotelLegOrders: number[]
  notes?: string
}

/** route-public.json's flight shape — same fields as FlightLeg minus
 *  bookingReference/seats. */
export interface PublicFlightLeg {
  label: string
  flightNumber: string
  route: string
  date: string
  departTime: string
  arriveTime: string
  coversHotelLegOrders: number[]
  notes?: string
}

/** Finer-grained transport mode used on intermediate stops within a `Leg` —
 *  distinct from the coarse `TransportMode` used for the main hotel-to-hotel
 *  route, which only distinguishes train/car/flight. */
export type WaypointMode = "shinkansen" | "local_train" | "car" | "flight" | "bus" | "metro"

/** An intermediate stop between two consecutive hotel stays — a transfer,
 *  a different-station walk, a bus connection — that the coarse hotel-to-hotel
 *  polyline can't show on its own. `mode` describes the leg departing this
 *  waypoint (towards the next waypoint, or the leg's `to` hotel if this is
 *  the last one). No lat/lon here by design — see `LegWaypoint` below, which
 *  carries the geocoded coordinate once resolved. */
export interface Waypoint {
  id: string
  name: string
  nameHe?: string
  geocodeQuery: string
  mode: WaypointMode
  departTime: string | null
  trainNumber?: string
  note?: string
}

/** route-public.json's resolved shape for `Waypoint` — same fields plus the
 *  geocoded coordinate, analogous to how `RouteStop` carries lat/lon
 *  alongside a hotel's public fields. */
export interface LegWaypoint extends Waypoint {
  lat: number | null
  lon: number | null
}

/** The stretch between hotel stop `from` and hotel stop `to` (same order
 *  values as `Hotel.order`/`RouteStop.order`), broken into its intermediate
 *  waypoints. A day trip that starts and ends at the same hotel sets
 *  `from === to`. Non-sensitive (station names, timetables) — lives in
 *  route-public.json alongside trains, never in the private trip file. */
export interface Leg {
  from: number
  to: number
  date: string
  waypoints: LegWaypoint[]
}

export interface RoutePublicData {
  hotels: RouteStop[]
  cars: PublicCarLeg[]
  flights: PublicFlightLeg[]
  trains: TrainLeg[]
  legs: Leg[]
}

export type RecommendationCategory = "food" | "sight" | "activity" | "nature" | "shopping"

export interface Recommendation {
  id: string
  name: string
  nameOriginal: string
  category: RecommendationCategory
  /** Hotel `order` this place is nearest to — the join key back into trip-data.json's hotels. */
  region: number
  description: string
  address: string | null
  lat: number
  lon: number
  costPerPerson: { amount: number; currency: string } | null
  websiteUrl: string | null
  photoUrl?: string
  notes: string | null
}
