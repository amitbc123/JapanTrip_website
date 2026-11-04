import { ArrowDown, ArrowUp, BedDouble, Copy, Footprints, Navigation, Route, TrainFront, Trash2, Wand2, X } from "lucide-react"
import { lazy, Suspense, useState } from "react"
import { Glyph } from "@/treasure/components/Icon"
import { Sheet } from "@/treasure/components/Sheet"
import { GROUPS, PLACES, PLACE_BY_ID, mainCat } from "@/treasure/data"
import {
  baseForDate,
  dateLong,
  dateShort,
  fmtKm,
  fmtMin,
  km,
  mapsUrl,
  nearestNeighbour,
  regionForDate,
  routeLinks,
  transitMin,
  tripDates,
  walkMin,
} from "@/treasure/lib/core"
import { autoBuild } from "@/treasure/lib/explore"
import { useWeather, weatherIcon, weatherText } from "@/treasure/lib/online"
import { useTreasure, useUi } from "@/treasure/store"
import type { Place } from "@/treasure/types"

const PlanMap = lazy(() => import("@/treasure/components/PlanMap").then((m) => ({ default: m.PlanMap })))

function AutoBuildSheet({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const region = regionForDate(date)
  const base = baseForDate(region, date)
  const groups = GROUPS.filter((g) => g.key !== "food" && PLACES.some((p) => p.region === region.key && p.cats.some((c) => g.cats.includes(c))))
  const [picked, setPicked] = useState<string[]>(["anime", "shop", "see"])
  const [radius, setRadius] = useState(6)
  const [stops, setStops] = useState(5)
  const [meal, setMeal] = useState(true)
  const plans = useTreasure((s) => s.plans)
  const visited = useTreasure((s) => s.vis)
  const setPlan = useTreasure((s) => s.setPlan)
  const showToast = useUi((s) => s.showToast)
  const chip = "chip min-h-11 rounded-full border border-line bg-card px-3.5 text-sm font-semibold"

  const build = () => {
    const cats = groups.filter((g) => picked.includes(g.key)).flatMap((g) => g.cats)
    const existing = plans[date] ?? []
    const pick = autoBuild(region, base, { cats, radiusKm: radius, stops, meal }, new Set(existing), visited)
    if (!pick.length) {
      showToast("לא נמצאו מקומות מתאימים. הרחיבו את המרחק")
      return
    }
    setPlan(date, nearestNeighbour([...existing, ...pick.map((p) => p.id)], base))
    onOpenChange(false)
    showToast("היום נבנה")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`בניית יום ב${region.he}`}>
      <div className="flex flex-col gap-5 pb-2">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-muted">מה מעניין אתכם היום?</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const on = picked.includes(g.key)
              return (
                <button
                  key={g.key}
                  type="button"
                  className="chip-cat flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-sm font-semibold"
                  style={{ "--c": g.color } as React.CSSProperties}
                  aria-pressed={on}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== g.key) : [...picked, g.key])}
                >
                  <span style={{ color: g.color }}>
                    <Glyph name={g.icon} className="size-4" />
                  </span>
                  {g.key === "special" ? `רק ב${region.he}` : g.he}
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-muted">כמה רחוק מהמלון?</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                [1.6, "ברגל (עד 20 דק׳)"],
                [6, "בעיר"],
                [60, "גם טיולי יום"],
              ] as const
            ).map(([r, label]) => (
              <button key={r} type="button" className={chip} aria-pressed={radius === r} onClick={() => setRadius(r)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-muted">כמה עצירות?</legend>
          <div className="flex flex-wrap gap-2">
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <button key={n} type="button" className={`${chip} min-w-11`} aria-pressed={stops === n} onClick={() => setStops(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-muted">אוכל</legend>
          <button type="button" className={chip} aria-pressed={meal} onClick={() => setMeal(!meal)}>
            לשלב ארוחה בלי פירות ים ובלי "מכיל חלב"
          </button>
        </fieldset>
        <button type="button" onClick={build} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold font-bold text-gold-ink">
          <Wand2 className="size-5" aria-hidden />
          בנה את היום
        </button>
      </div>
    </Sheet>
  )
}

function DayWeather({ date, at }: { date: string; at: { lat: number; lon: number } }) {
  const { weather } = useWeather(at)
  const day = weather?.days[date]
  if (!day) return null
  return (
    <span className="rounded-full bg-card-2 px-3 py-1 text-xs font-semibold">
      {weatherIcon(day.code)} {weatherText(day.code)} · <span dir="ltr">{day.min}°-{day.max}°</span> · ☔ {day.rain}% · שקיעה {day.sunset}
    </span>
  )
}

export function PlanTab({ today, date }: { today: string; date: string }) {
  const setUi = useUi((s) => s.setUi)
  const showToast = useUi((s) => s.showToast)
  const plans = useTreasure((s) => s.plans)
  const setPlan = useTreasure((s) => s.setPlan)
  const [autoOpen, setAutoOpen] = useState(false)
  const region = regionForDate(date)
  const base = baseForDate(region, date)
  // Places removed from the data in an update simply drop out.
  const ids = (plans[date] ?? []).filter((id) => PLACE_BY_ID.has(id))
  const stops = ids.map((id) => PLACE_BY_ID.get(id)!) as Place[]
  const links = routeLinks(base, stops)

  const legs = stops.map((p, i) => km(i ? stops[i - 1]! : base, p))
  const total = legs.reduce((sum, d) => sum + d, 0)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setPlan(date, next)
  }

  const copy = async () => {
    const text =
      `התוכנית ל${dateLong(date)} (${region.he}):\n` +
      stops.map((p, i) => `${i + 1}. ${p.en} - ${p.he}\n${mapsUrl(p)}`).join("\n") +
      (links.length ? `\n\nמסלול ב-Google Maps:\n${links.map((l) => l.url).join("\n")}` : "")
    try {
      await navigator.clipboard.writeText(text)
      showToast("הועתק. אפשר להדביק בוואטסאפ")
    } catch {
      showToast("לא הצלחתי להעתיק")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">התוכנית שלי</h2>
        <span className="text-xs text-muted">נשמר בטלפון</span>
      </div>
      <select
        value={date}
        onChange={(e) => setUi({ planDate: e.target.value })}
        aria-label="בחירת יום"
        className="min-h-12 rounded-2xl border border-line bg-card px-3 text-[16px] font-semibold"
      >
        {tripDates(today).map((d) => (
          <option key={d} value={d}>
            {dateLong(d)} · {regionForDate(d).he}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
            <BedDouble className="size-5" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <b dir="ltr" className="truncate text-end text-sm">
              {base.name}
            </b>
            <span className="text-xs text-muted">יוצאים מהמלון ב{region.he}</span>
          </span>
        </div>
        <DayWeather date={date} at={base} />
      </div>

      {stops.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          אין עדיין מקומות ליום הזה.
          <br />
          לחצו על ＋ בכרטיס של מקום, או תנו לי לבנות יום אוטומטית.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [String(stops.length), "עצירות"],
              [fmtKm(total), "סה״כ בקו ישר"],
              [fmtMin(total <= 6 ? walkMin(total) : transitMin(total)), "זמן תנועה משוער"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-line bg-card p-2.5">
                <b className="block text-lg">{v}</b>
                <span className="text-xs text-muted">{l}</span>
              </div>
            ))}
          </div>

          <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
            <PlanMap hotel={{ lat: base.lat, lon: base.lon, label: base.name }} stops={stops} />
          </Suspense>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold">כל היום ב-Google Maps</h3>
              <span className="text-xs text-muted">{links.length > 1 ? "מחולק לחלקים, לפתוח לפי הסדר" : "קישור אחד"}</span>
            </div>
            {links.map((l, i) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl font-bold ${i === 0 ? "bg-gold text-gold-ink" : "border border-line bg-card"}`}
              >
                <Navigation className="size-4" aria-hidden />
                {links.length > 1 ? `חלק ${i + 1}: עצירות ${l.from}-${l.to}` : "פתיחת כל המסלול"}
              </a>
            ))}
          </div>

          <ol className="flex flex-col gap-1.5">
            {stops.map((p, i) => {
              const d = legs[i]!
              const cat = mainCat(p)
              return (
                <li key={p.id} className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 ps-4 text-xs text-muted">
                    {d <= 2 ? <Footprints className="size-3.5" aria-hidden /> : <TrainFront className="size-3.5" aria-hidden />}
                    {fmtKm(d)} · {d <= 2 ? `${fmtMin(walkMin(d))} הליכה` : `${fmtMin(transitMin(d))} בתחבורה`}
                  </span>
                  <div style={{ "--c": cat.color } as React.CSSProperties} className="flex items-center gap-2 rounded-2xl border border-line bg-card p-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full font-extrabold text-[#0b1626]" style={{ background: cat.color }}>
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b dir="ltr" className="truncate text-end text-sm">
                        {p.en}
                      </b>
                      <span className="truncate text-xs text-muted">{p.he}</span>
                    </span>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="למעלה" className="grid size-10 place-items-center rounded-xl text-muted disabled:opacity-30">
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === stops.length - 1} aria-label="למטה" className="grid size-10 place-items-center rounded-xl text-muted disabled:opacity-30">
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setPlan(date, ids.filter((x) => x !== p.id))} aria-label="הסרה" className="grid size-10 place-items-center rounded-xl text-muted">
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPlan(date, nearestNeighbour(ids, base))
                showToast("המסלול סודר")
              }}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card px-3 text-sm font-semibold"
            >
              <Route className="size-4" aria-hidden />
              סדר אופטימלי
            </button>
            <button type="button" onClick={copy} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card px-3 text-sm font-semibold">
              <Copy className="size-4" aria-hidden />
              העתקה לוואטסאפ
            </button>
            <button type="button" onClick={() => setPlan(date, [])} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card px-3 text-sm font-semibold">
              <Trash2 className="size-4" aria-hidden />
              ניקוי
            </button>
          </div>
        </>
      )}

      <button type="button" onClick={() => setAutoOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold font-bold text-gold-ink">
        <Wand2 className="size-5" aria-hidden />
        בנה לי יום לפי עניין ומרחק
      </button>
      <p className="text-center text-xs text-dim">התוכנית של {dateShort(date)} נשמרת בטלפון הזה בלבד.</p>
      <AutoBuildSheet open={autoOpen} onOpenChange={setAutoOpen} date={date} />
    </div>
  )
}
