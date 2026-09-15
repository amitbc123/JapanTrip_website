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

/** Trains carry no sensitive booking details (no PNR, no phone) beyond
 *  what's already shown on the public homepage, so unlike cars/flights
 *  there's no separate private/public variant. */
export interface TrainLeg {
  label: string
  trainNumber: string
  route: string
  date: string
  departTime: string
  arriveTime: string
  price: Price | null
  paidBy: string
  coversHotelLegOrders: number[]
}

export interface TripData {
  tripDates: { start: string; end: string }
  travelers: string[]
  hotels: Hotel[]
  attractions: Attraction[]
  cars: CarLeg[]
  flights: FlightLeg[]
  /** Optional so existing trip-data.json files without a trains section
   *  keep validating. */
  trains?: TrainLeg[]
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
}

export interface RoutePublicData {
  hotels: RouteStop[]
  cars: PublicCarLeg[]
  flights: PublicFlightLeg[]
  trains: TrainLeg[]
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
