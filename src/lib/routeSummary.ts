import { formatHebrewDate, formatPrice, NOT_AVAILABLE } from "@/lib/format"
import {
  translateCarLabel,
  translateCarLabelByName,
  translateCarPickupLocation,
  translateCarDropoffLocation,
  translateCity,
  translateFlightRoute,
  translateTrainRoute,
} from "@/lib/translations"
import type { CarLeg, PrivateTrainInfo, PublicCarLeg, TrainLeg } from "@/types/trip"

export interface CarSummaryRow {
  key: string
  label: string
  pickupLine: string
  dropoffLine: string
  coversHotelLegOrders: number[]
  notes?: string
}

export interface FlightSummaryRow {
  key: string
  label: string
  timeLine: string
  coversHotelLegOrders: number[]
  notes?: string
}

interface FlightLegLike {
  flightNumber: string
  route: string
  date: string
  departTime: string
  arriveTime: string
  coversHotelLegOrders: number[]
  notes?: string
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
    notes: car.notes,
  }
}

export function flightSummary(flight: FlightLegLike): FlightSummaryRow {
  return {
    key: flight.flightNumber,
    label: `טיסה פנימית · ${flight.flightNumber} · ${translateFlightRoute(flight.flightNumber, flight.route)}`,
    timeLine: `המראה: ${formatHebrewDate(flight.date)} ${flight.departTime} · נחיתה: ${flight.arriveTime}`,
    coversHotelLegOrders: flight.coversHotelLegOrders,
    notes: flight.notes,
  }
}

export interface TrainSummaryRow {
  key: string
  label: string
  timeLine: string
  paidByLine?: string
  coversHotelLegOrders: number[]
  notes?: string
  /** Whether the schedule itself is confirmed (departTime/arriveTime known) —
   *  the default booking status before the rider has touched it locally. */
  isBooked: boolean
}

/** `privateInfo` (price/paidBy/seats) only exists once the private trip
 *  file is loaded and carries a matching `trainNumber` — without it the
 *  card just shows the public route/schedule, no financial line. */
export function trainSummary(train: TrainLeg, privateInfo?: PrivateTrainInfo): TrainSummaryRow {
  const hasSchedule = train.departTime !== null && train.arriveTime !== null
  const paidByLine = privateInfo
    ? `${formatPrice(privateInfo.price)} · שולם על ידי: ${privateInfo.paidBy ?? NOT_AVAILABLE}${
        privateInfo.seats?.length ? ` · מושבים: ${privateInfo.seats.join(", ")}` : ""
      }`
    : undefined
  const scheduleLine = hasSchedule
    ? `יציאה: ${formatHebrewDate(train.date)} ${train.departTime} · הגעה: ${train.arriveTime}`
    : `${formatHebrewDate(train.date)} · לוח זמנים סופי טרם ידוע`
  return {
    key: train.label,
    label: `רכבת · ${train.trainNumber} · ${translateTrainRoute(train.trainNumber, train.route)}`,
    timeLine: train.booked ? scheduleLine : `${scheduleLine} · טרם הוזמן`,
    paidByLine,
    coversHotelLegOrders: train.coversHotelLegOrders,
    notes: train.notes,
    isBooked: train.booked,
  }
}
