import { parseDateOnly } from "@/lib/format"
import type { Hotel } from "@/types/trip"

const DEFAULT_ORDER = 1

/** Which hotel `order` we're currently at, based on today's real date versus
 *  each hotel's check-in date: the current stop is the last one (by order)
 *  whose check-in date has already arrived. Before the trip starts (or when
 *  no hotel has a check-in date yet), defaults to stop 1. */
export function getCurrentHotelOrder(hotels: Hotel[]): number {
  if (hotels.length === 0) return DEFAULT_ORDER

  const todayUtc = (() => {
    const now = new Date()
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  })()

  const sorted = [...hotels].sort((a, b) => a.order - b.order)
  let current = sorted[0]?.order ?? DEFAULT_ORDER

  for (const hotel of sorted) {
    if (!hotel.checkIn) continue
    if (parseDateOnly(hotel.checkIn).getTime() <= todayUtc) {
      current = hotel.order
    } else {
      break
    }
  }

  return current
}
