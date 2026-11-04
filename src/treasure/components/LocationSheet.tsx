import { BedDouble, Check, ClipboardPaste, LocateFixed, MapPin, RefreshCw } from "lucide-react"
import { useRef, useState } from "react"
import { Glyph } from "@/treasure/components/Icon"
import { Sheet } from "@/treasure/components/Sheet"
import { PLACES, mainCat } from "@/treasure/data"
import { km, parseLatLon, regionNear } from "@/treasure/lib/core"
import type { TripContext } from "@/treasure/lib/hooks"
import { locationHelp, startLocation, stopLocation, useLiveLocation, type LocationStatus } from "@/treasure/lib/location"
import { useTreasure, useUi } from "@/treasure/store"

const PROBLEMS: LocationStatus[] = ["denied", "unavailable", "timeout", "unsupported"]

export function LocationSheet({ ctx }: { ctx: TripContext }) {
  const sheet = useUi((s) => s.locationSheet)
  const setUi = useUi((s) => s.setUi)
  const showToast = useUi((s) => s.showToast)
  const status = useLiveLocation((s) => s.status)
  const manual = useTreasure((s) => s.manual)
  const set = useTreasure((s) => s.set)
  const [coords, setCoords] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const input = useRef<HTMLInputElement | null>(null)
  const close = () => setUi({ locationSheet: { open: false, message: null } })

  const applyManual = (lat: number, lon: number, label: string) => {
    set({ manual: { lat, lon, label, at: Date.now() }, useLoc: true })
    // A manual point picks its region (when it's near one of the hotels).
    const near = regionNear({ lat, lon })
    if (near) setUi({ region: null })
    close()
    showToast(`המרחקים מחושבים מ${label}`)
  }

  const tryGps = () => {
    set({ manual: null })
    startLocation((failed) => setUi({ locationSheet: { open: true, message: failed } }))
    close()
    showToast("מאתר מיקום…")
  }

  const submit = () => {
    const r = parseLatLon(coords)
    if (r.ok) {
      setError(null)
      applyManual(r.lat, r.lon, "הנקודה שהזנתם")
      return
    }
    setError(
      r.reason === "short-link"
        ? "קישור מקוצר של Google Maps (maps.app.goo.gl) אי אפשר לפענח כאן. פתחו אותו, לחצו לחיצה ארוכה על הנקודה והעתיקו את המספרים."
        : r.reason === "range"
          ? "המספרים מחוץ לטווח. קו רוחב בין -90 ל-90 וקו אורך בין -180 ל-180."
          : "לא זיהיתי קואורדינטות. דוגמה: 35.6938, 139.7034"
    )
  }

  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText()
      setCoords(t)
      const r = parseLatLon(t)
      setError(r.ok ? null : "בלוח אין נ.צ שאפשר לזהות")
    } catch {
      input.current?.focus()
      showToast("לחיצה ארוכה בשדה ואז 'הדבק'")
    }
  }

  const problem = sheet.message && PROBLEMS.includes(sheet.message as LocationStatus) ? (sheet.message as LocationStatus) : null
  const help = problem ? locationHelp(problem) : null
  const query = q.trim().toLowerCase()
  const nearList = PLACES.filter((p) => p.region === ctx.region.key)
    .filter((p) => (query ? `${p.en} ${p.he}`.toLowerCase().includes(query) : p.mustSee || p.cats.some((c) => ["sight", "temple", "mall", "shop"].includes(c))))
    .sort((a, b) => km(ctx.base, a) - km(ctx.base, b))
    .slice(0, 14)

  return (
    <Sheet open={sheet.open} onOpenChange={(o) => (o ? undefined : close())} title="איפה אתם עכשיו?">
      <div className="flex flex-col gap-4 pb-2">
        {help && (
          <div className="flex flex-col gap-2 rounded-2xl border border-warn/50 bg-warn/10 p-3 text-sm">
            <b>{help.title}</b>
            <ol className="list-inside list-decimal space-y-1">
              {help.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        {problem !== "unsupported" && (
          <button type="button" onClick={tryGps} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gold font-bold text-gold-ink">
            {problem ? <RefreshCw className="size-5" aria-hidden /> : <LocateFixed className="size-5" aria-hidden />}
            {problem ? "לנסות שוב" : status === "on" ? "לחזור למיקום החי (GPS)" : "לאתר אותי (GPS)"}
          </button>
        )}

        <div className="flex flex-col gap-2 rounded-2xl border border-gold/60 bg-card p-3">
          <b className="text-sm text-gold">הכנסת נ.צ</b>
          <div className="flex gap-2">
            <input
              ref={input}
              value={coords}
              onChange={(e) => setCoords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="35.6938, 139.7034"
              dir="ltr"
              inputMode="text"
              autoComplete="off"
              aria-label="קואורדינטות"
              aria-invalid={!!error}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-sea-2 px-3 text-[16px] outline-none focus:border-gold"
            />
            <button type="button" onClick={paste} className="flex min-h-11 items-center gap-1 rounded-xl border border-line px-3 text-sm font-semibold">
              <ClipboardPaste className="size-4" aria-hidden />
              הדבק
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          <button type="button" onClick={submit} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-card-2 font-semibold">
            <Check className="size-4" aria-hidden />
            השתמש בנ.צ
          </button>
          <p className="text-xs text-muted">
            ב-Google Maps: לחיצה ארוכה על הנקודה הכחולה או על המקום שלכם, והמספרים מופיעים בשורת החיפוש. מעתיקים ומדביקים כאן. עובד גם עם מעלות
            (35°41'N 139°42'E) ועם קישור מלא של Google Maps.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <b className="text-sm">או: אני ליד...</b>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`מקום, תחנה או אטרקציה ב${ctx.region.he}`}
            aria-label="חיפוש מקום קרוב"
            className="min-h-11 rounded-xl border border-line bg-card px-3 text-[16px] outline-none focus:border-gold"
          />
          <div className="flex flex-col gap-1.5">
            {nearList.map((p) => {
              const cat = mainCat(p)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyManual(p.lat, p.lon, p.he)}
                  style={{ "--c": cat.color } as React.CSSProperties}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 text-start"
                >
                  <span className="tile grid size-8 shrink-0 place-items-center rounded-lg">
                    <Glyph name={cat.icon} className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <b dir="ltr" className="truncate text-end text-sm">
                      {p.en}
                    </b>
                    <span className="truncate text-xs text-muted">{p.he}</span>
                  </span>
                </button>
              )
            })}
            {!nearList.length && <p className="p-3 text-center text-sm text-muted">לא נמצא. נסו שם אחר.</p>}
          </div>
        </div>

        {(ctx.origin.me || manual || status === "on") && (
          <button
            type="button"
            onClick={() => {
              set({ manual: null, useLoc: false })
              stopLocation()
              close()
              showToast("המרחקים מהמלון")
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line font-semibold"
          >
            <BedDouble className="size-5" aria-hidden />
            חזרה למרחקים מהמלון
          </button>
        )}
        {!ctx.origin.me && (
          <p className="flex items-center gap-1.5 text-xs text-dim">
            <MapPin className="size-3.5" aria-hidden />
            מיקום ידני נשמר ל-6 שעות. מיקום חי משמש רק כשאתם בעיר שמוצגת.
          </p>
        )}
      </div>
    </Sheet>
  )
}
