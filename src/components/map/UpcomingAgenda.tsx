import {
  BedDoubleIcon,
  CarIcon,
  LogInIcon,
  LogOutIcon,
  type LucideIcon,
  PackageIcon,
  PartyPopperIcon,
  PlaneIcon,
  TicketIcon,
  TrainFrontIcon,
} from "lucide-react"
import { Link } from "react-router"
import { BookingStatusControl } from "@/components/common/BookingStatusControl"
import { FestivalCard } from "@/components/festivals/FestivalCard"
import { carBookingId, flightBookingId, trainBookingId } from "@/components/map/bookingIds"
import { formatHebrewDate, parseDateOnly } from "@/lib/format"
import type { AgendaDay, AgendaItem, AgendaKind } from "@/lib/upcoming"
import { useRouteHighlightStore } from "@/stores/route-highlight-store"

const KIND_ICON: Record<AgendaKind, LucideIcon> = {
  "hotel-out": LogOutIcon,
  "hotel-in": LogInIcon,
  train: TrainFrontIcon,
  "car-pickup": CarIcon,
  "car-dropoff": CarIcon,
  flight: PlaneIcon,
  attraction: TicketIcon,
  luggage: PackageIcon,
  festival: PartyPopperIcon,
}

const weekdayFormatter = new Intl.DateTimeFormat("he-IL", { weekday: "long", timeZone: "UTC" })

function dayTitle(date: string, index: number): string {
  const prefix = index === 0 ? "היום" : index === 1 ? "מחר" : weekdayFormatter.format(parseDateOnly(date))
  return `${prefix} · ${formatHebrewDate(date)}`
}

function bookingIdOf(item: AgendaItem): string | null {
  if (!item.highlightKey) return null
  if (item.kind === "train") return trainBookingId(item.highlightKey)
  if (item.kind === "flight") return flightBookingId(item.highlightKey)
  if (item.kind === "car-pickup" || item.kind === "car-dropoff") return carBookingId(item.highlightKey)
  return null
}

function scrollMapIntoView() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function ItemBody({ item, travelers, isBookedByDefault }: { item: AgendaItem; travelers?: string[]; isBookedByDefault: boolean }) {
  const Icon = KIND_ICON[item.kind]
  const bookingId = bookingIdOf(item)
  return (
    <>
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[15px] font-medium">
            {item.time && item.kind !== "train" && item.kind !== "flight" ? `${item.time} · ` : ""}
            {item.title}
          </span>
          {bookingId && item.kind !== "car-dropoff" && (
            <BookingStatusControl id={bookingId} defaultBooked={isBookedByDefault} travelers={travelers} />
          )}
        </div>
        {item.detail && <span className="text-[13px] text-muted-foreground">{item.detail}</span>}
        {item.extra && <span className="text-[13px] text-muted-foreground">{item.extra}</span>}
        {item.notes && <span className="text-[13px] text-destructive">{item.notes}</span>}
      </div>
    </>
  )
}

const CARD = "flex gap-3 rounded-lg border p-3 text-start transition-colors"

function AgendaItemCard({
  item,
  travelers,
  bookedByDefault,
}: {
  item: AgendaItem
  travelers?: string[]
  bookedByDefault: (key: string) => boolean
}) {
  const highlightedKey = useRouteHighlightStore((s) => s.highlightedKey)
  const toggle = useRouteHighlightStore((s) => s.toggle)

  if (item.festival) return <FestivalCard festival={item.festival} distanceKm={item.distanceKm} />

  const body = (
    <ItemBody item={item} travelers={travelers} isBookedByDefault={item.highlightKey ? bookedByDefault(item.highlightKey) : true} />
  )

  if (item.highlightKey) {
    const key = item.highlightKey
    const isOn = highlightedKey === key
    const activate = () => {
      if (toggle(key)) scrollMapIntoView()
    }
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isOn}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return
          e.preventDefault()
          activate()
        }}
        className={`${CARD} cursor-pointer ${isOn ? "border-destructive bg-destructive/5" : "border-border bg-card hover:bg-accent/40"}`}
      >
        {body}
      </div>
    )
  }

  const target =
    item.hotelOrder !== undefined
      ? `/?hotel=${item.hotelOrder}`
      : item.attractionName
        ? `/?attraction=${encodeURIComponent(item.attractionName)}`
        : null
  if (target) {
    return (
      <Link to={target} onClick={scrollMapIntoView} className={`${CARD} border-border bg-card hover:bg-accent/40`}>
        {body}
      </Link>
    )
  }
  return <div className={`${CARD} border-border bg-card`}>{body}</div>
}

export function UpcomingAgenda({
  days,
  hasPrivateData,
  travelers,
  bookedByDefault,
}: {
  days: AgendaDay[]
  hasPrivateData: boolean
  travelers?: string[]
  bookedByDefault: (key: string) => boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {!hasPrivateData && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">
          מלונות ואטרקציות יופיעו כאן אחרי טעינת קובץ הטיול.
        </p>
      )}
      {days.map((day, index) => (
        <section key={day.date} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <h2 className="text-[15px] font-semibold">{dayTitle(day.date, index)}</h2>
          {day.stay && (
            <Link
              to={`/?hotel=${day.stay.order}`}
              onClick={scrollMapIntoView}
              className="flex items-center gap-2 text-[13px] text-muted-foreground hover:underline"
            >
              <BedDoubleIcon className="size-4 shrink-0 text-primary" aria-hidden />
              <span>
                לינה: {day.stay.name} · {day.stay.city} · לילה {day.stay.night} מתוך {day.stay.nights}
              </span>
            </Link>
          )}
          {day.items.length === 0 && day.farFestivalCount === 0 ? (
            <span className="text-[13px] text-muted-foreground">אין משהו מתוכנן ליום הזה.</span>
          ) : (
            <div className="flex flex-col gap-2">
              {day.items.map((item) => (
                <AgendaItemCard key={item.id} item={item} travelers={travelers} bookedByDefault={bookedByDefault} />
              ))}
              {day.farFestivalCount > 0 && (
                <Link to="/festivals" className="text-[13px] text-primary hover:underline">
                  {day.farFestivalCount === 1
                    ? "פסטיבל נוסף רחוק יותר"
                    : `עוד ${day.farFestivalCount} פסטיבלים רחוקים יותר`}{" "}
                  בעמוד הפסטיבלים
                </Link>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
