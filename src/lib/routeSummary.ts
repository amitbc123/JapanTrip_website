import { formatHebrewDate } from "@/lib/format"
import {
  translateCarLabel,
  translateCarLabelByName,
  translateCarPickupLocation,
  translateCarDropoffLocation,
  translateCity,
  translateFlightRoute,
} from "@/lib/translations"
import type { CarLeg, PublicCarLeg } from "@/types/trip"

export interface CarSummaryRow {
  key: string
  label: string
  pickupLine: string
  dropoffLine: string
  coversHotelLegOrders: number[]
}

export interface FlightSummaryRow {
  key: string
  label: string
  timeLine: string
  coversHotelLegOrders: number[]
}

interface FlightLegLike {
  flightNumber: string
  route: string
  date: string
  departTime: string
  arriveTime: string
  coversHotelLegOrders: number[]
}

export function carSummaryFromPrivate(car: CarLeg): CarSummaryRow {
  return {
    key: car.label,
    label: `${translateCarLabel(car.bookingNumber)} · ${car.model}`,
    pickupLine: `איסוף: ${translateCarPickupLocation(car.bookingNumber, car.pickup.location)}, ${formatHebrewDate(car.pickup.date)} ${car.pickup.time}`,
    dropoffLine: `החזרה: ${translateCarDropoffLocation(car.bookingNumber, car.dropoff.location)}, ${formatHebrewDate(car.dropoff.date)} ${car.dropoff.time}`,
    coversHotelLegOrders: car.coversHotelLegOrders,
  }
}

export function carSummaryFromPublic(car: PublicCarLeg): CarSummaryRow {
  return {
    key: car.label,
    label: translateCarLabelByName(car.label),
    pickupLine: `איסוף: ${translateCity(car.pickupCity)}, ${formatHebrewDate(car.pickupDate)} ${car.pickupTime}`,
    dropoffLine: `החזרה: ${translateCity(car.dropoffCity)}, ${formatHebrewDate(car.dropoffDate)} ${car.dropoffTime}`,
    coversHotelLegOrders: car.coversHotelLegOrders,
  }
}

export function flightSummary(flight: FlightLegLike): FlightSummaryRow {
  return {
    key: flight.flightNumber,
    label: `טיסה פנימית · ${flight.flightNumber} · ${translateFlightRoute(flight.flightNumber, flight.route)}`,
    timeLine: `המראה: ${formatHebrewDate(flight.date)} ${flight.departTime} · נחיתה: ${flight.arriveTime}`,
    coversHotelLegOrders: flight.coversHotelLegOrders,
  }
}
