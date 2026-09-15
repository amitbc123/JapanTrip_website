import type { TripData } from "@/types/trip"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Structural check of the trip-data.json shape the app expects — deliberately
 * shallow (checks the fields the app actually reads, not every optional
 * field) rather than a full schema library, since there's exactly one input
 * path and one fixed shape.
 */
export function isTripData(value: unknown): value is TripData {
  if (!isRecord(value)) return false
  if (!isRecord(value.tripDates)) return false
  if (!isArray(value.travelers)) return false
  if (!isArray(value.hotels) || !value.hotels.every(isValidHotel)) return false
  if (!isArray(value.attractions) || !value.attractions.every(isValidAttraction)) return false
  if (!isArray(value.cars) || !value.cars.every(isValidCar)) return false
  if (!isArray(value.flights) || !value.flights.every(isValidFlight)) return false
  return true
}

function isValidHotel(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.order === "number" &&
    typeof value.name === "string" &&
    typeof value.city === "string" &&
    typeof value.nights === "number" &&
    typeof value.geocode === "boolean"
  )
}

function isValidAttraction(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.name === "string" &&
    typeof value.city === "string" &&
    typeof value.date === "string" &&
    typeof value.geocode === "boolean"
  )
}

function isValidCar(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.label === "string" &&
    typeof value.bookingNumber === "string" &&
    isRecord(value.pickup) &&
    isRecord(value.dropoff) &&
    isArray(value.coversHotelLegOrders)
  )
}

function isValidFlight(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.label === "string" &&
    typeof value.flightNumber === "string" &&
    isArray(value.coversHotelLegOrders)
  )
}
