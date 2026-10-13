import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useState } from "react"
import travelTips from "@/data/travel-tips.json"
import { ITAYA_NOTE, RIDES, formatDuration, formatLength, type RideView } from "@/lib/tunnelRides"
import { useTunnelViewStore } from "@/stores/tunnel-view-store"

const tunnelTips = (travelTips as { tunnelTips: string[] }).tunnelTips

/** The ride drawn as a strip from boarding (right) to arrival (left), with
 *  tunnels in red and roofed track in amber — how much of the ride is
 *  underground, and where, at a glance. */
function RideStrip({ ride }: { ride: RideView }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-4 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        {ride.tunnels.map((t) => (
          <span
            key={`${t.rawIndex}`}
            className={`absolute top-0 h-full ${t.kind === "tunnel" ? "bg-red-600" : "bg-amber-400"}`}
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
  const isSelected = selectedRide === ride.key

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        isSelected ? "border-red-600 bg-red-600/5" : "border-border bg-card"
      }`}
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
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 self-start text-xs font-medium text-primary"
            aria-expanded={open}
          >
            {open ? <ChevronUpIcon className="size-4" aria-hidden /> : <ChevronDownIcon className="size-4" aria-hidden />}
            {open ? "הסתרת רשימת המנהרות" : `כל המנהרות לפי הסדר (${ride.tunnels.length})`}
          </button>
          {open && (
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
                          t.kind === "tunnel" ? "bg-red-600" : "bg-amber-400"
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
export function TunnelPanel() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-red-600/30 bg-red-600/5 p-3">
        <h2 className="text-base font-bold">🚇 מצב מנהרות - המסלולים המדויקים של הרכבות שלנו</h2>
        <p className="text-[13px]">
          על המפה מסומנים רק מסלולי הרכבות שלנו, על המסילה עצמה.{" "}
          <span className="font-semibold text-red-700">אדום = מנהרה</span>,{" "}
          <span className="font-semibold text-amber-700">כתום מקווקו = קטע מקורה</span>, אפור = נסיעה באוויר
          הפתוח. לחיצה על מנהרה במפה מציגה את האורך ואת הזמן המשוער בפנים. לחיצה נוספת על כפתור המנהרה מחזירה
          את המפה הרגילה.
        </p>
        <p className="text-xs text-muted-foreground">
          הזמנים הם הערכה לפי מהירות אופיינית של כל קו. נתוני המסילות והמנהרות: OpenStreetMap דרך Overture
          Maps. מנהרות קצרות מ-100 מ' לא מוצגות.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {RIDES.map((ride) => (
          <RideCard key={ride.key} ride={ride} />
        ))}
      </ul>

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
