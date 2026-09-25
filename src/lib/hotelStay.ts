import { parseDateOnly } from "@/lib/format"
import type { Hotel } from "@/types/trip"

const DAY_MS = 24 * 60 * 60 * 1000

export interface HotelStay {
  /** "YYYY-MM-DD", or null when it can't be known or inferred. */
  checkIn: string | null
  checkOut: string | null
  nights: number
  /** True when either date was inferred from the neighbouring stops rather
   *  than taken from this hotel's own booking. */
  estimated: boolean
}

function datePart(isoLike: string | null | undefined): string | null {
  return isoLike ? (isoLike.split("T")[0] ?? null) : null
}

function addDays(date: string, days: number): string {
  return new Date(parseDateOnly(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDateOnly(end).getTime() - parseDateOnly(start).getTime()) / DAY_MS)
}

/** Each hotel's stay dates and length. A hotel missing its own dates (e.g. a
 *  booking whose receipt didn't include them) borrows them from its
 *  neighbours — the stops are back to back, so the previous stop's
 *  check-out is this check-in and the next stop's check-in is this
 *  check-out — falling back to its own night count for a missing side. */
export function getHotelStays(hotels: Hotel[]): Map<number, HotelStay> {
  const sorted = [...hotels].sort((a, b) => a.order - b.order)
  const stays = new Map<number, HotelStay>()

  sorted.forEach((hotel, i) => {
    const ownIn = datePart(hotel.checkIn)
    const ownOut = datePart(hotel.checkOut)
    const prevOut = datePart(sorted[i - 1]?.checkOut)
    const nextIn = datePart(sorted[i + 1]?.checkIn)

    let checkIn = ownIn ?? prevOut
    let checkOut = ownOut ?? nextIn
    if (!checkIn && checkOut && hotel.nights > 0) checkIn = addDays(checkOut, -hotel.nights)
    if (checkIn && !checkOut && hotel.nights > 0) checkOut = addDays(checkIn, hotel.nights)

    const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : hotel.nights
    stays.set(hotel.order, {
      checkIn,
      checkOut,
      nights,
      estimated: checkIn !== ownIn || checkOut !== ownOut,
    })
  })

  return stays
}

export function formatNights(nights: number): string {
  if (nights === 1) return "לילה אחד"
  if (nights === 2) return "2 לילות"
  return `${nights} לילות`
}
