/** Status of a bookable item (train/car/flight) — tracked entirely client-side
 *  in localStorage, separate from the trip data JSON, so marking something
 *  booked during the trip never requires editing and re-importing a file. */
export type BookingStatusValue = "not_booked" | "pending" | "done"

export interface BookingStatusEntry {
  status: BookingStatusValue
  updatedAt: string
  paidBy: string | null
  price: number | null
  currency: string | null
  confirmationNumber: string | null
  seats: string | null
  note: string | null
}

export type BookingStatusMap = Record<string, BookingStatusEntry>
