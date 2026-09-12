import type { Price } from "@/types/trip"

export const NOT_AVAILABLE = "לא זמין"

/** Parses the date-only part of an ISO-ish "YYYY-MM-DD[THH:mm:ss]" string as
 *  a UTC-anchored Date, so formatting never shifts by a day due to the
 *  viewer's local timezone (the source strings are JST wall-clock times). */
function parseDateOnly(isoLike: string): Date {
  const [datePart] = isoLike.split("T")
  const parts = (datePart ?? isoLike).split("-").map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return new Date(Date.UTC(year, month - 1, day))
}

function extractTime(isoLike: string): string | null {
  const [, timePart] = isoLike.split("T")
  if (!timePart) return null
  const [hh, mm] = timePart.split(":")
  return `${hh}:${mm}`
}

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

const dateFormatterWithYear = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

export function formatHebrewDate(isoLike: string, withYear = false): string {
  const date = parseDateOnly(isoLike)
  return (withYear ? dateFormatterWithYear : dateFormatter).format(date)
}

export function formatHebrewDateRange(startIso: string, endIso: string): string {
  return `${formatHebrewDate(startIso)} – ${formatHebrewDate(endIso, true)}`
}

export function formatHebrewTime(isoLike: string): string | null {
  return extractTime(isoLike)
}

export function formatPrice(price: Price | null | undefined): string {
  if (!price) return NOT_AVAILABLE
  const formatter = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: price.currency === "JPY" ? 0 : 2,
  })
  let label = formatter.format(price.amount)
  if (price.approxILS) {
    label += ` (≈ ${new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(price.approxILS)})`
  } else if (price.approxJPY) {
    label += ` (≈ ${new Intl.NumberFormat("he-IL", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(price.approxJPY)})`
  }
  if (price.note) label += ` — ${price.note}`
  return label
}

export function orNotAvailable(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : NOT_AVAILABLE
}

export function hotelAccordionId(order: number): string {
  return `hotel-${order}`
}
