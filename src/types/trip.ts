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

export interface TripData {
  tripDates: { start: string; end: string }
  travelers: string[]
  hotels: Hotel[]
  attractions: Attraction[]
  cars: CarLeg[]
  flights: FlightLeg[]
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
