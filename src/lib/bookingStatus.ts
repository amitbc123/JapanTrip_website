import type { BookingStatusMap, BookingStatusValue } from "@/types/bookingStatus"
import type { TripData } from "@/types/trip"

export const STATUS_LABEL_HE: Record<BookingStatusValue, string> = {
  not_booked: "טרם הוזמן",
  pending: "בתהליך",
  done: "בוצע",
}

export const STATUS_EMOJI: Record<BookingStatusValue, string> = {
  not_booked: "⬜",
  pending: "🕐",
  done: "✅",
}

/** A single export/import round-trip: the private trip data plus the
 *  current booking status, as one file — re-importing it through "טעינת
 *  קובץ חדש" restores both the trip data and every status/price/note at
 *  once, so there's no separate status file to keep track of. */
export function downloadTripDataWithStatus(data: TripData, entries: BookingStatusMap): void {
  const payload: TripData = { ...data, bookingStatus: entries }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `japan-trip-data-updated-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Shallow structural check, same spirit as validateTripData.ts — the
 *  `bookingStatus` field comes from a previously exported file (possibly
 *  edited by hand, or from another phone), so it's read defensively rather
 *  than trusted outright. */
export function sanitizeBookingStatusMap(value: unknown): BookingStatusMap {
  if (!isRecord(value)) return {}

  const result: BookingStatusMap = {}
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue
    if (entry.status !== "not_booked" && entry.status !== "pending" && entry.status !== "done") continue
    result[id] = {
      status: entry.status,
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
      paidBy: typeof entry.paidBy === "string" ? entry.paidBy : null,
      price: typeof entry.price === "number" ? entry.price : null,
      currency: typeof entry.currency === "string" ? entry.currency : null,
      confirmationNumber: typeof entry.confirmationNumber === "string" ? entry.confirmationNumber : null,
      seats: typeof entry.seats === "string" ? entry.seats : null,
      note: typeof entry.note === "string" ? entry.note : null,
    }
  }
  return result
}
