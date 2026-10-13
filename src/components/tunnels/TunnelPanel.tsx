import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useState } from "react"
import travelTips from "@/data/travel-tips.json"
import {
  ITAYA_NOTE,
  JOURNEYS,
  formatDuration,
  formatLength,
  type JourneyView,
  type RideView,
} from "@/lib/tunnelRides"
import { useTunnelViewStore } from "@/stores/tunnel-view-store"

const tunnelTips = (travelTips as { tunnelTips: string[] }).tunnelTips

/** The ride drawn as a strip from boarding (right) to arrival (left), with
 *  tunnels in black and roofed track in grey — how much of the ride is
 *  underground, and where, at a glance. */
function RideStrip({ ride }: { ride: RideView }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative h-4 overflow-hidden rounded-full"
        style={{ background: `color-mix(in srgb, ${ride.color} 35%, white)` }}
        aria-hidden
      >
        {ride.tunnels.map((t) => (
          <span
            key={`${t.rawIndex}`}
            className={`absolute top-0 h-full ${t.kind === "tunnel" ? "bg-gray-900" : "bg-gray-400"}`}
            style={{
              right: `${(t.fromBoardingKm / ride.lengthKm) * 100}%`,
              width: `max(2px, ${(t.lengthM / 1000 / ride.lengthKm) * 100}%)`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>עלייה</span>
        <span>{ride.lengthKm} ק"מ</span>
        <span>ירידה</span>
      </div>
    </div>
  )
}

function RideCard({ ride }: { ride: RideView }) {
  const [open, setOpen] = useState(false)
  const selectedRide = useTunnelViewStore((s) => s.selectedRide)
  const selectRide = useTunnelViewStore((s) => s.selectRide)
  const focusTunnel = useTunnelViewStore((s) => s.focusTunnel)
  const expandedRide = useTunnelViewStore((s) => s.expandedRide)
  const isSelected = selectedRide === ride.key
  // Opened by the user here, or by "list of tunnels" in the map popup.
  const isOpen = open || expandedRide === ride.key

  return (
    <li
      id={`tunnel-ride-${ride.key}`}
      className="flex scroll-mt-20 flex-col gap-2 rounded-xl border border-s-[6px] bg-card p-3"
      style={{ borderInlineStartColor: ride.color, borderColor: isSelected ? ride.color : undefined }}
    >
      <button
        type="button"
        onClick={() => {
          selectRide(isSelected ? null : ride.key)
          document.getElementById("home-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        className="flex flex-col gap-0.5 text-start"
        aria-pressed={isSelected}
      >
        <span className="text-[15px] font-semibold">
          <span className="me-1.5 inline-block size-3 rounded-full align-middle" style={{ background: ride.color }} />
          {ride.title}
          {!ride.booked && <span className="ms-2 text-xs font-normal text-muted-foreground">(טרם הוזמן)</span>}
        </span>
        <span className="text-[13px]">{ride.subtitle}</span>
        {ride.when && <span className="text-xs text-muted-foreground">{ride.when}</span>}
      </button>

      {ride.tunnelCount === 0 ? (
        <p className="rounded-lg bg-emerald-600/10 px-3 py-2 text-sm font-medium text-emerald-800">
          🎉 אין מנהרות בנסיעה הזו
          {ride.coveredCount > 0 && ` (רק ${ride.coveredCount} קטע מקורה קצר)`}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-muted px-2 py-1">{ride.tunnelCount} מנהרות</span>
            <span className="rounded-full bg-muted px-2 py-1">
              {ride.undergroundKm.toFixed(1)} ק"מ בפנים ({ride.undergroundPct}% מהדרך)
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              סה"כ בפנים: {formatDuration(ride.undergroundMinutes)}
            </span>
          </div>
          {ride.longest && (
            <p className="text-[13px]">
              הארוכה ביותר: <span className="font-semibold">{ride.longest.name ?? "מנהרה"}</span>,{" "}
              {formatLength(ride.longest.lengthM)}, {formatDuration(ride.longest.minutes)} רצוף
            </p>
          )}
        </>
      )}

      <RideStrip ride={ride} />

      {ride.tunnels.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => {
              if (isOpen && expandedRide === ride.key) useTunnelViewStore.setState({ expandedRide: null })
              setOpen(!isOpen)
            }}
            className="flex items-center gap-1 self-start text-xs font-medium text-primary"
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUpIcon className="size-4" aria-hidden /> : <ChevronDownIcon className="size-4" aria-hidden />}
            {isOpen ? "הסתרת רשימת המנהרות" : `כל המנהרות לפי הסדר (${ride.tunnels.length})`}
          </button>
          {isOpen && (
            <ol className="flex flex-col divide-y divide-border rounded-lg border border-border text-[13px]">
              {ride.tunnels.map((t, i) => (
                <li key={t.rawIndex}>
                  <button
                    type="button"
                    onClick={() => {
                      focusTunnel(ride.key, i)
                      document.getElementById("home-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-accent/40"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block size-2.5 shrink-0 rounded-full ${
                          t.kind === "tunnel" ? "bg-gray-900" : "bg-gray-400"
                        }`}
                        aria-hidden
                      />
                      <span>
                        {t.kind === "covered" ? "קטע מקורה" : (t.name ?? "מנהרה")}
                        <span className="text-muted-foreground"> · ק"מ {t.fromBoardingKm.toFixed(1)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatLength(t.lengthM)} · {formatDuration(t.minutes)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {ride.tunnels.some((t) => t.inItayaPass) && (
            <p className="rounded-lg bg-emerald-600/10 px-3 py-2 text-xs text-emerald-800">📶 {ITAYA_NOTE}</p>
          )}
        </>
      )}
    </li>
  )
}

/** The tunnel view's companion below the map (made for Omri): every train
 *  ride with how much of it runs underground, the longest stretch, and each
 *  tunnel in order. */
function JourneyChips() {
  const selected = useTunnelViewStore((s) => s.selectedRide)
  const selectRide = useTunnelViewStore((s) => s.selectRide)
  return (
    <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
      <button
        type="button"
        onClick={() => selectRide(null)}
        aria-pressed={selected === null}
        className={`h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium ${
          selected === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
        }`}
      >
        כל המסעות
      </button>
      {JOURNEYS.map((journey) => {
        const isOn = selected === journey.key || journey.rides.some((r) => r.key === selected)
        return (
          <button
            key={journey.key}
            type="button"
            onClick={() => selectRide(journey.key)}
            aria-pressed={isOn}
            className={`flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap ${
              isOn ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {journey.rides.map((r) => (
              <span key={r.key} className="inline-block size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
            ))}
            <span className="ms-1">
              {journey.number}. {journey.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** One hotel-to-hotel move: its trains in order (each in its map colour),
 *  joined by where we change. */
function JourneyCard({ journey }: { journey: JourneyView }) {
  const selected = useTunnelViewStore((s) => s.selectedRide)
  const selectRide = useTunnelViewStore((s) => s.selectRide)
  const isOn = selected === journey.key
  return (
    <li className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          selectRide(isOn ? null : journey.key)
          document.getElementById("home-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        aria-pressed={isOn}
        className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-start ${
          isOn ? "border-primary bg-primary/5" : "border-border bg-muted/40"
        }`}
      >
        <span className="text-xs font-semibold text-muted-foreground">
          מסע {journey.number} · {journey.when}
        </span>
        <span className="text-base font-bold">
          {journey.from.label} ← {journey.to.label} · {journey.title}
        </span>
        <span className="flex flex-wrap items-center gap-1 text-[13px]">
          {journey.rides.map((r, i) => (
            <span key={r.key} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">←</span>}
              <span className="inline-block size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
              {r.shortLabel}
            </span>
          ))}
        </span>
        <span className="text-[13px]">
          {journey.tunnelCount === 0
            ? "🎉 בלי מנהרות"
            : `${journey.tunnelCount} מנהרות · ${journey.undergroundKm.toFixed(1)} ק"מ בפנים · סה"כ ${formatDuration(journey.undergroundMinutes)}`}
          {journey.longest &&
            ` · הארוכה: ${journey.longest.tunnel.name ?? "מנהרה"} (${formatDuration(journey.longest.tunnel.minutes)})`}
        </span>
      </button>
      <ul className="flex flex-col gap-2 border-s-2 border-dashed border-border ps-3">
        {journey.links[0] && <li className="text-xs text-muted-foreground">⋯ {journey.links[0].note}</li>}
        {journey.rides.map((ride) => (
          <RideCard key={ride.key} ride={ride} />
        ))}
        {journey.links.length > 1 && (
          <li className="text-xs text-muted-foreground">⋯ {journey.links[journey.links.length - 1]!.note}</li>
        )}
      </ul>
    </li>
  )
}

export function TunnelPanel() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-red-600/30 bg-red-600/5 p-3">
        <h2 className="text-base font-bold">🚇 מצב מנהרות - המסלולים המדויקים של הרכבות שלנו</h2>
        <p className="text-[13px]">
          הרכבות מסודרות לפי <span className="font-semibold">מסעות</span>: כל מסע הוא מעבר ממלון אחד לאחר (עם
          המספר של המלון על המפה), וכל רכבת בו בצבע משלה. קו מנוקד = קטע שאינו אחת הרכבות (אוטובוס, רכב, הליכה).{" "}
          <span className="font-semibold">קטע שחור עבה עם הילה אדומה</span> = מנהרה, ותגית 🚇 מציינת את האורך שלה
          בק"מ. אפור מקווקו = קטע מקורה. המיקום שלך מופיע כנקודה כחולה. לחיצה נוספת על כפתור המנהרה מחזירה את
          המפה הרגילה.
        </p>
        <p className="text-xs text-muted-foreground">
          הזמנים הם הערכה לפי מהירות אופיינית של כל קו. נתוני המסילות והמנהרות: OpenStreetMap דרך Overture
          Maps. מנהרות קצרות מ-100 מ' לא מוצגות.
        </p>
      </div>

      <JourneyChips />

      <ol className="flex flex-col gap-5">
        {JOURNEYS.map((journey) => (
          <JourneyCard key={journey.key} journey={journey} />
        ))}
      </ol>

      {tunnelTips.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <h3 className="mb-2 text-sm font-semibold">מה שעוזר במנהרות</h3>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {tunnelTips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
