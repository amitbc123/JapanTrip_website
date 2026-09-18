import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { BookingStatusEntry, BookingStatusMap, BookingStatusValue } from "@/types/bookingStatus"

export const STATUS_CYCLE: BookingStatusValue[] = ["not_booked", "pending", "done"]

function emptyEntry(status: BookingStatusValue): BookingStatusEntry {
  return {
    status,
    updatedAt: new Date().toISOString(),
    paidBy: null,
    price: null,
    currency: null,
    confirmationNumber: null,
    seats: null,
    note: null,
  }
}

interface BookingStatusState {
  entries: BookingStatusMap
  /** Advances an entry's status to the next state in the cycle, creating it
   *  (starting from `fallback`) if this is the first time it's touched. */
  cycleStatus: (id: string, fallback: BookingStatusValue) => void
  updateEntry: (id: string, patch: Partial<Omit<BookingStatusEntry, "updatedAt">>) => void
  importEntries: (entries: BookingStatusMap) => void
  clearAll: () => void
}

export const useBookingStatusStore = create<BookingStatusState>()(
  persist(
    (set) => ({
      entries: {},
      cycleStatus: (id, fallback) =>
        set((state) => {
          const current = state.entries[id] ?? emptyEntry(fallback)
          const idx = STATUS_CYCLE.indexOf(current.status)
          const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? "not_booked"
          return {
            entries: { ...state.entries, [id]: { ...current, status: next, updatedAt: new Date().toISOString() } },
          }
        }),
      updateEntry: (id, patch) =>
        set((state) => {
          const current = state.entries[id] ?? emptyEntry("not_booked")
          return {
            entries: { ...state.entries, [id]: { ...current, ...patch, updatedAt: new Date().toISOString() } },
          }
        }),
      importEntries: (entries) => set((state) => ({ entries: { ...state.entries, ...entries } })),
      clearAll: () => set({ entries: {} }),
    }),
    { name: "japan-trip-booking-status" }
  )
)

/** The status to show for an id that has never been touched in this store —
 *  items the trip data already marks as booked (a confirmed departure time,
 *  a booking number) default to "done" instead of "not_booked", so the
 *  counters are accurate from the very first load, before anyone clicks
 *  anything. */
export function effectiveStatus(entry: BookingStatusEntry | undefined, defaultBooked: boolean): BookingStatusValue {
  return entry?.status ?? (defaultBooked ? "done" : "not_booked")
}
