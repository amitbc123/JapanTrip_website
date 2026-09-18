import type { BookingStatusMap, BookingStatusValue } from "@/types/bookingStatus"

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

export function downloadBookingStatusExport(entries: BookingStatusMap): void {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `japan-trip-status-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Shallow structural check, same spirit as validateTripData.ts — this file
 *  is user-provided (from a previous export, possibly from another phone),
 *  so it's parsed defensively rather than trusted outright. */
export function parseBookingStatusImport(text: string): BookingStatusMap | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null

  const result: BookingStatusMap = {}
  for (const [id, value] of Object.entries(parsed)) {
    if (!isRecord(value)) continue
    if (value.status !== "not_booked" && value.status !== "pending" && value.status !== "done") continue
    result[id] = {
      status: value.status,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
      paidBy: typeof value.paidBy === "string" ? value.paidBy : null,
      price: typeof value.price === "number" ? value.price : null,
      currency: typeof value.currency === "string" ? value.currency : null,
      confirmationNumber: typeof value.confirmationNumber === "string" ? value.confirmationNumber : null,
      seats: typeof value.seats === "string" ? value.seats : null,
      note: typeof value.note === "string" ? value.note : null,
    }
  }
  return result
}
