import { formatHebrewTime, parseDateOnly } from "@/lib/format"
import { getHotelStays } from "@/lib/hotelStay"
import type { CarSummaryRow, FlightSummaryRow, TrainSummaryRow } from "@/lib/routeSummary"
import { translateCity } from "@/lib/translations"
import type { Attraction, Hotel, LocalFestival } from "@/types/trip"

/** Today plus the next two days. */
export const UPCOMING_DAY_COUNT = 3

/** Festivals farther than this from that night's hotel stay off the agenda
 *  (they're still on the festivals page). */
export const FESTIVAL_RADIUS_KM = 150

const DAY_MS = 24 * 60 * 60 * 1000

/** "YYYY-MM-DD" in Japan time - every date in the trip data is a JST date. */
export function todayInJapan(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now)
}

export function addDaysIso(date: string, days: number): string {
  return new Date(parseDateOnly(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return "פחות מק״מ"
  if (km < 10) return `כ-${Math.round(km)} ק״מ`
  return `כ-${Math.round(km / 5) * 5} ק״מ`
}

export type AgendaKind =
  | "hotel-out"
  | "hotel-in"
  | "train"
  | "car-pickup"
  | "car-dropoff"
  | "flight"
  | "attraction"
  | "luggage"
  | "festival"

export interface AgendaItem {
  id: string
  kind: AgendaKind
  /** "HH:mm" when known. */
  time: string | null
  title: string
  detail?: string
  extra?: string
  notes?: string
  /** Route-highlight key for train/car/flight rows. */
  highlightKey?: string
  hotelOrder?: number
  attractionName?: string
  festival?: LocalFestival
  /** Approximate distance from that night's hotel, festivals only. */
  distanceKm?: number
}

export interface AgendaStay {
  order: number
  name: string
  city: string
  night: number
  nights: number
}

export interface AgendaDay {
  date: string
  stay: AgendaStay | null
  items: AgendaItem[]
  /** Festivals running that day but beyond FESTIVAL_RADIUS_KM. */
  farFestivalCount: number
}

export interface LuggageForwarding {
  date: string
  from: string
  to: string
  note: string
}

export interface AgendaInput {
  trains: TrainSummaryRow[]
  cars: CarSummaryRow[]
  flights: FlightSummaryRow[]
  /** Only present once the private trip file is loaded. */
  hotels?: Hotel[]
  attractions: Attraction[]
  festivals: LocalFestival[]
  luggage: LuggageForwarding[]
}

/** Fallback position within a day for items without a known time. */
const DEFAULT_TIME: Record<AgendaKind, string> = {
  luggage: "07:00",
  "hotel-out": "10:00",
  train: "12:00",
  "car-pickup": "12:00",
  "car-dropoff": "12:00",
  flight: "12:00",
  attraction: "12:00",
  "hotel-in": "15:00",
  festival: "99:99",
}

function timeOfSortKey(sortKey: string): string | null {
  return formatHebrewTime(sortKey)
}

export function stayOn(date: string, hotels: Hotel[] | undefined): AgendaStay | null {
  if (!hotels) return null
  const stays = getHotelStays(hotels)
  for (const hotel of hotels) {
    const stay = stays.get(hotel.order)
    if (!stay?.checkIn || !stay.checkOut) continue
    if (stay.checkIn <= date && date < stay.checkOut) {
      const night = Math.round((parseDateOnly(date).getTime() - parseDateOnly(stay.checkIn).getTime()) / DAY_MS) + 1
      return { order: hotel.order, name: hotel.name, city: translateCity(hotel.city), night, nights: stay.nights }
    }
  }
  return null
}

/** Everything that happens on each of the next `UPCOMING_DAY_COUNT` days,
 *  starting today (Japan time). Multi-day festivals show once, on the first
 *  of these days they're running. */
export function buildAgenda(input: AgendaInput, today = todayInJapan()): AgendaDay[] {
  const dates = Array.from({ length: UPCOMING_DAY_COUNT }, (_, i) => addDaysIso(today, i))
  const lastDate = dates[dates.length - 1] ?? today
  const stays = input.hotels ? getHotelStays(input.hotels) : null
  const hotelPositions = new Map(
    (input.hotels ?? []).flatMap((h) => (h.lat !== null && h.lon !== null ? [[h.order, { lat: h.lat, lon: h.lon }] as const] : []))
  )
  const shownFestivals = new Set<string>()

  return dates.map((date) => {
    const items: AgendaItem[] = []
    const stay = stayOn(date, input.hotels)
    let farFestivalCount = 0

    for (const train of input.trains) {
      if (!train.sortKey.startsWith(date)) continue
      items.push({
        id: `train:${train.key}`,
        kind: "train",
        time: train.timeLine.includes("טרם ידוע") ? null : timeOfSortKey(train.sortKey),
        title: train.label,
        detail: train.timeLine,
        extra: train.paidByLine,
        notes: train.notes,
        highlightKey: train.key,
      })
    }
    for (const car of input.cars) {
      if (car.sortKey.startsWith(date)) {
        items.push({
          id: `car-pickup:${car.key}`,
          kind: "car-pickup",
          time: timeOfSortKey(car.sortKey),
          title: car.label,
          detail: car.pickupLine,
          notes: car.notes,
          highlightKey: car.key,
        })
      }
      if (car.dropoffSortKey.startsWith(date)) {
        items.push({
          id: `car-dropoff:${car.key}`,
          kind: "car-dropoff",
          time: timeOfSortKey(car.dropoffSortKey),
          title: car.label,
          detail: car.dropoffLine,
          highlightKey: car.key,
        })
      }
    }
    for (const flight of input.flights) {
      if (!flight.sortKey.startsWith(date)) continue
      items.push({
        id: `flight:${flight.key}`,
        kind: "flight",
        time: timeOfSortKey(flight.sortKey),
        title: flight.label,
        detail: flight.timeLine,
        notes: flight.notes,
        highlightKey: flight.key,
      })
    }
    for (const hotel of input.hotels ?? []) {
      const hotelStay = stays?.get(hotel.order)
      if (!hotelStay) continue
      if (hotelStay.checkOut === date) {
        items.push({
          id: `hotel-out:${hotel.order}`,
          kind: "hotel-out",
          time: hotel.checkOut ? formatHebrewTime(hotel.checkOut) : null,
          title: `צ׳ק-אאוט · ${hotel.name}`,
          detail: translateCity(hotel.city),
          hotelOrder: hotel.order,
        })
      }
      if (hotelStay.checkIn === date) {
        items.push({
          id: `hotel-in:${hotel.order}`,
          kind: "hotel-in",
          time: hotel.checkIn ? formatHebrewTime(hotel.checkIn) : null,
          title: `צ׳ק-אין · ${hotel.name}`,
          detail: hotelStay.estimated ? `${translateCity(hotel.city)} · תאריך משוער` : translateCity(hotel.city),
          notes: hotel.notes ?? undefined,
          hotelOrder: hotel.order,
        })
      }
    }
    for (const attraction of input.attractions) {
      if (attraction.date?.split("T")[0] !== date) continue
      items.push({
        id: `attraction:${attraction.name}`,
        kind: "attraction",
        time: attraction.entryTime,
        title: attraction.name,
        detail: translateCity(attraction.city),
        notes: attraction.notes ?? undefined,
        attractionName: attraction.name,
      })
    }
    for (const luggage of input.luggage) {
      if (luggage.date !== date) continue
      items.push({
        id: `luggage:${luggage.date}:${luggage.to}`,
        kind: "luggage",
        time: null,
        title: `שילוח מזוודות מ${luggage.from} ל${luggage.to}`,
        notes: luggage.note,
      })
    }
    for (const festival of input.festivals) {
      if (shownFestivals.has(festival.id)) continue
      if (festival.startDate > date || festival.endDate < date) continue
      if (festival.endDate < today || festival.startDate > lastDate) continue
      const hotelPos = stay ? hotelPositions.get(stay.order) : undefined
      const distance = hotelPos ? distanceKm(hotelPos, festival) : undefined
      if (distance !== undefined && distance > FESTIVAL_RADIUS_KM) {
        farFestivalCount++
        continue
      }
      shownFestivals.add(festival.id)
      items.push({
        id: `festival:${festival.id}`,
        kind: "festival",
        time: null,
        title: festival.name,
        detail: `${festival.dateLabel} · ${festival.location}`,
        festival,
        distanceKm: distance,
      })
    }

    items.sort((a, b) => {
      if (a.kind === "festival" && b.kind === "festival") {
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
      }
      return (a.time ?? DEFAULT_TIME[a.kind]).localeCompare(b.time ?? DEFAULT_TIME[b.kind])
    })
    return { date, stay, items, farFestivalCount }
  })
}
