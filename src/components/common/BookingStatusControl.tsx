import { PencilIcon } from "lucide-react"
import { useState } from "react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { STATUS_EMOJI, STATUS_LABEL_HE } from "@/lib/bookingStatus"
import { effectiveStatus, useBookingStatusStore } from "@/stores/booking-status-store"
import type { BookingStatusValue } from "@/types/bookingStatus"

const STATUS_CLASS: Record<BookingStatusValue, string> = {
  not_booked: "border-border bg-muted text-muted-foreground",
  pending: "border-warning/40 bg-warning/10 text-warning",
  done: "border-success/40 bg-success/10 text-success",
}

interface BookingStatusControlProps {
  id: string
  defaultBooked: boolean
  travelers?: string[]
}

/** Cyclic status badge (click to advance ⬜ → 🕐 → ✅) plus a small edit
 *  drawer for the fields that go with it — who paid, price, confirmation
 *  number, seats, a note. Everything here lives in localStorage
 *  (booking-status-store), never in the trip data file. */
export function BookingStatusControl({ id, defaultBooked, travelers }: BookingStatusControlProps) {
  const entry = useBookingStatusStore((s) => s.entries[id])
  const cycleStatus = useBookingStatusStore((s) => s.cycleStatus)
  const updateEntry = useBookingStatusStore((s) => s.updateEntry)
  const [isOpen, setIsOpen] = useState(false)

  const status = effectiveStatus(entry, defaultBooked)

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => cycleStatus(id, defaultBooked ? "done" : "not_booked")}
        className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium ${STATUS_CLASS[status]}`}
      >
        <span aria-hidden>{STATUS_EMOJI[status]}</span>
        {STATUS_LABEL_HE[status]}
      </button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="עריכת פרטי ההזמנה"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <PencilIcon className="size-3.5" aria-hidden />
        </button>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>פרטי הזמנה</DrawerTitle>
          </DrawerHeader>
          <form
            className="flex flex-col gap-3 px-4 pb-2"
            onSubmit={(e) => {
              e.preventDefault()
              setIsOpen(false)
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              מי שילם
              {travelers && travelers.length > 0 ? (
                <select
                  defaultValue={entry?.paidBy ?? ""}
                  onChange={(e) => updateEntry(id, { paidBy: e.target.value || null })}
                  className="h-10 rounded-md border border-input bg-background px-2"
                >
                  <option value="">—</option>
                  {travelers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  defaultValue={entry?.paidBy ?? ""}
                  onBlur={(e) => updateEntry(id, { paidBy: e.target.value || null })}
                  className="h-10 rounded-md border border-input bg-background px-2"
                />
              )}
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                מחיר
                <input
                  type="number"
                  defaultValue={entry?.price ?? ""}
                  onBlur={(e) => updateEntry(id, { price: e.target.value ? Number(e.target.value) : null })}
                  className="h-10 rounded-md border border-input bg-background px-2"
                />
              </label>
              <label className="flex w-24 flex-col gap-1 text-sm">
                מטבע
                <select
                  defaultValue={entry?.currency ?? "JPY"}
                  onChange={(e) => updateEntry(id, { currency: e.target.value || null })}
                  className="h-10 rounded-md border border-input bg-background px-2"
                >
                  <option value="JPY">JPY</option>
                  <option value="ILS">ILS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              מספר אישור
              <input
                defaultValue={entry?.confirmationNumber ?? ""}
                onBlur={(e) => updateEntry(id, { confirmationNumber: e.target.value || null })}
                className="h-10 rounded-md border border-input bg-background px-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מושבים
              <input
                defaultValue={entry?.seats ?? ""}
                onBlur={(e) => updateEntry(id, { seats: e.target.value || null })}
                className="h-10 rounded-md border border-input bg-background px-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              הערה
              <textarea
                defaultValue={entry?.note ?? ""}
                onBlur={(e) => updateEntry(id, { note: e.target.value || null })}
                rows={2}
                className="rounded-md border border-input bg-background px-2 py-1.5"
              />
            </label>
          </form>
          <DrawerFooter>
            <DrawerClose className="h-11 rounded-md bg-primary font-medium text-primary-foreground hover:opacity-90">
              סגירה
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
