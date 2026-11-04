import { BedDouble, LocateFixed, MapPin, WifiOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Sheet } from "@/treasure/components/Sheet"
import { PLACES, REGIONS } from "@/treasure/data"
import { dateLong, dateShort } from "@/treasure/lib/core"
import type { TripContext } from "@/treasure/lib/hooks"
import { useLiveLocation } from "@/treasure/lib/location"
import { useOnline, useWeather, weatherIcon, weatherText } from "@/treasure/lib/online"
import { useUi } from "@/treasure/store"

const COUNT = Object.fromEntries(REGIONS.map((r) => [r.key, PLACES.filter((p) => p.region === r.key).length]))

function partOfDay(h: number): string {
  return h < 11 ? "בוקר" : h < 15 ? "צהריים" : h < 18 ? "אחר הצהריים" : h < 22 ? "ערב" : "לילה"
}

function WeatherChip({ ctx }: { ctx: TripContext }) {
  const { weather, at } = useWeather(ctx.origin)
  const online = useOnline()
  const [open, setOpen] = useState(false)
  if (!weather) return null
  const today = weather.days[ctx.now.date]
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-semibold"
        aria-label={`מזג אוויר: ${weather.now.temp} מעלות, ${weatherText(weather.now.code)}`}
      >
        <span aria-hidden>{weatherIcon(weather.now.code)}</span>
        <span dir="ltr">{weather.now.temp}°</span>
        {today && today.rain >= 30 && <span className="text-xs font-medium text-muted">☔ {today.rain}%</span>}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={`מזג האוויר ב${ctx.region.he}`}>
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-sm text-muted">
            {weatherText(weather.now.code)}, {weather.now.temp}°
            {today && ` · היום ${today.min}°-${today.max}°, סיכוי לגשם ${today.rain}%, שקיעה ב-${today.sunset}`}
          </p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {weather.hours.map((h) => (
              <div key={h.time} className="flex min-w-16 flex-col items-center gap-1 rounded-2xl border border-line bg-card px-2 py-2.5 text-sm">
                <span className="text-xs text-muted" dir="ltr">
                  {h.time}
                </span>
                <span aria-hidden>{weatherIcon(h.code)}</span>
                <b dir="ltr">{h.temp}°</b>
                <span className="text-xs text-muted">{h.rain}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-dim">
            {online ? "" : "אין אינטרנט: מוצגת התחזית האחרונה ששמרנו. "}
            עודכן {at ? new Date(at).toLocaleTimeString("he-IL", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : ""} · Open-Meteo
          </p>
        </div>
      </Sheet>
    </>
  )
}

export function Header({ ctx }: { ctx: TripContext }) {
  const setUi = useUi((s) => s.setUi)
  const openLocation = useUi((s) => s.openLocation)
  const status = useLiveLocation((s) => s.status)
  const online = useOnline()
  const { now, region, todayRegion, origin } = ctx
  const rail = useRef<HTMLDivElement | null>(null)
  // Keep the selected city in view (e.g. Tokyo from a shared link).
  useEffect(() => {
    rail.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: "nearest", block: "nearest" })
  }, [region.key])

  return (
    <header className="flex flex-col gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold tracking-wide text-gold">מפת האוצר · יפן 2026</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums" dir="ltr">
              {now.hm}
            </span>
            <span className="truncate text-sm text-muted">{dateLong(now.date)} · שעון יפן</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {!online && (
            <span className="flex h-9 items-center gap-1 rounded-full border border-line px-2.5 text-xs text-muted" title="אין אינטרנט">
              <WifiOff className="size-4" aria-hidden />
              אופליין
            </span>
          )}
          <WeatherChip ctx={ctx} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-card-2 px-3 py-1.5 text-xs font-semibold text-muted">
          {partOfDay(now.h)} ב{todayRegion.he}
        </span>
        <button
          type="button"
          onClick={() => openLocation()}
          className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            origin.me ? "border-ok/60 bg-ok/10 text-ok" : "border-line bg-card text-ink"
          }`}
        >
          {origin.me ? (
            <>
              <span className="relative flex size-2.5">
                {!origin.manual && <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />}
                <span className="relative inline-flex size-2.5 rounded-full bg-ok" />
              </span>
              {origin.manual ? `מרחקים מ: ${origin.label}` : "מרחקים מהמיקום שלך"}
            </>
          ) : status === "locating" ? (
            <>
              <LocateFixed className="size-4 animate-pulse" aria-hidden />
              מאתר מיקום…
            </>
          ) : (
            <>
              {status === "on" ? <BedDouble className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
              {status === "on" ? "מרחקים מהמלון" : "איפה אני?"}
            </>
          )}
        </button>
      </div>

      <div ref={rail} className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1" role="tablist" aria-label="ערי הטיול">
        {REGIONS.map((r) => {
          const past = now.date >= r.to
          const live = now.date >= r.from && now.date < r.to
          const selected = r.key === region.key
          return (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setUi({ region: r.key, group: "", cats: [], openId: null, mapPick: null })}
              className={`relative flex min-w-[124px] snap-start flex-col items-start gap-0.5 overflow-hidden rounded-2xl border px-3.5 py-3 text-start transition-colors ${
                selected ? "border-gold bg-card-2 shadow-[var(--shadow)]" : "border-line bg-card"
              } ${past && !selected ? "opacity-60" : ""}`}
            >
              <span className="kanji-mark" aria-hidden>
                {r.kanji}
              </span>
              {live && <span className="mb-0.5 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-gold-ink">עכשיו</span>}
              {past && <span className="mb-0.5 rounded-full bg-card-2 px-2 py-0.5 text-[11px] font-bold text-muted">היינו</span>}
              <b className="text-base">{r.he}</b>
              <span className="text-xs text-muted">
                {dateShort(r.from)} - {dateShort(r.to)}
              </span>
              <span className="text-xs text-dim">{COUNT[r.key]} מקומות</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
