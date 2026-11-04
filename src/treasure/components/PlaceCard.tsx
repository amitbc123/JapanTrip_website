import {
  Bus,
  CalendarPlus,
  Check,
  ExternalLink,
  Footprints,
  Heart,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Plus,
  Route,
  Ruler,
  Share2,
  TrainFront,
} from "lucide-react"
import { Glyph } from "@/treasure/components/Icon"
import { AREAS, CATS, REGIONS, cityEn, isFood, mainCat } from "@/treasure/data"
import {
  dateShort,
  directionsUrl,
  fmtKm,
  fmtMin,
  howTo,
  imagesUrl,
  mapsUrl,
  priceText,
  transitMin,
  walkMin,
  type HowStep,
} from "@/treasure/lib/core"
import { useOnline, useWiki } from "@/treasure/lib/online"
import { useTreasure, useUi } from "@/treasure/store"
import type { Origin, Place } from "@/treasure/types"

function Tag({ children, tone }: { children: React.ReactNode; tone: "gold" | "ok" | "warn" | "bad" | "red" | "muted" }) {
  const cls = {
    gold: "bg-gold/15 text-gold",
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    bad: "bg-bad/15 text-bad",
    red: "bg-red/15 text-red",
    muted: "bg-card-2 text-muted",
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>
}

export function PlaceTags({ p }: { p: Place }) {
  const region = REGIONS.find((r) => r.key === p.region)
  const score = p.hardOff?.score
  return (
    <>
      {p.mustSee && <Tag tone="gold">חובה</Tag>}
      {p.special && <Tag tone="gold">👑 רק ב{region?.he ?? "עיר"}</Tag>}
      {score ? (
        <Tag tone="gold">
          <span dir="ltr" aria-label={`Hard Off ${score} מתוך 5`}>
            {"★".repeat(score)}
            {"☆".repeat(5 - score)}
          </span>
        </Tag>
      ) : null}
      {isFood(p) && (
        <>
          {p.seafood === "mostly" && <Tag tone="red">פירות ים</Tag>}
          {p.seafood === "none" && <Tag tone="ok">בלי פירות ים</Tag>}
          {p.dairy === "free" && <Tag tone="ok">בלי חלב בד״כ</Tag>}
          {p.dairy === "ask" && <Tag tone="warn">חלב: לשאול</Tag>}
          {p.dairy === "contains" && <Tag tone="bad">מכיל חלב</Tag>}
        </>
      )}
    </>
  )
}

export function MetaRow({ p, d }: { p: Place; d: number }) {
  const area = AREAS[p.area]
  const item = "inline-flex items-center gap-1"
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className={item}>
        <Ruler className="size-3.5" aria-hidden />
        {fmtKm(d)}
      </span>
      {area?.trip && d > 20 ? (
        <span className={`${item} text-gold`}>
          <TrainFront className="size-3.5" aria-hidden />
          טיול יום
        </span>
      ) : (
        <>
          {d <= 4 && (
            <span className={item}>
              <Footprints className="size-3.5" aria-hidden />
              {fmtMin(walkMin(d))}
            </span>
          )}
          {d > 0.9 && (
            <span className={item}>
              <TrainFront className="size-3.5" aria-hidden />
              {fmtMin(transitMin(d))}
            </span>
          )}
          {p.price !== null && <span>{priceText(p.price)}</span>}
        </>
      )}
    </span>
  )
}

function StepIcon({ step }: { step: HowStep }) {
  const cls = "mt-0.5 size-4 shrink-0 text-gold"
  if (step.kind === "ride" || step.kind === "trip") return <TrainFront className={cls} aria-hidden />
  if (step.kind === "bus-from-station" || step.kind === "no-station") return <Bus className={cls} aria-hidden />
  if (step.kind === "walk-from-station") return <MapPin className={cls} aria-hidden />
  return <Footprints className={cls} aria-hidden />
}

function StepText({ step, from }: { step: HowStep; from: string }) {
  const st = (name: string) => (
    <b dir="ltr" className="font-semibold">
      {name}
    </b>
  )
  switch (step.kind) {
    case "walk-only":
      return (
        <>
          {from}: הליכה של {fmtMin(step.minutes)} ({fmtKm(step.km)}).
        </>
      )
    case "trip":
      return <>{step.text}</>
    case "walk-to-station":
      return (
        <>
          הליכה {fmtMin(step.minutes)} לתחנת {st(step.station)}
        </>
      )
    case "ride":
      return (
        <>
          {step.direct ? `קו ${step.lines.join(" או ")} ישיר` : `עם החלפה (מ-${step.fromLines.join("/")} ל-${step.toLines.join("/")})`} עד
          תחנת {st(step.station)}
        </>
      )
    case "walk-from-station":
      return <>משם הליכה של {fmtMin(step.minutes)}</>
    case "bus-from-station":
      return <>משם {fmtKm(step.km)}: אוטובוס או מונית</>
    case "one-station":
      return (
        <>
          הליכה של {fmtMin(step.minutes)}, או תחנה אחת קרובה: {st(step.station)}
        </>
      )
    case "no-station":
      return <>אין תחנה קרובה במאגר. הכי פשוט: אוטובוס או מונית, בערך {fmtMin(step.minutes)}.</>
  }
}

function HowTo({ p, origin }: { p: Place; origin: Origin }) {
  const from = origin.me ? "מהמיקום שלך" : "מהמלון"
  const steps = howTo(p, origin)
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-sea-2 p-3">
      <b className="flex items-center gap-1.5 text-sm">
        <Route className="size-4 text-gold" aria-hidden />
        איך מגיעים {from}
      </b>
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <StepIcon step={s} />
          <span>
            <StepText step={s} from={from} />
          </span>
        </div>
      ))}
      <span className="text-xs text-dim">הערכה לפי מרחק. למסלול מדויק: "מסלול".</span>
    </div>
  )
}

function WikiBox({ p }: { p: Place }) {
  const online = useOnline()
  const { info, loading } = useWiki(p, cityEn(p), true)
  if (loading)
    return (
      <div className="flex gap-3 rounded-2xl border border-line p-3" aria-hidden>
        <div className="skeleton size-20 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
    )
  if (!info) return null
  return (
    <a
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-2xl border border-line bg-sea-2 p-3 text-start hover:border-gold"
      dir={info.lang === "en" ? "ltr" : "rtl"}
    >
      {info.image && online && (
        <img src={info.image} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-4 text-sm leading-relaxed">{info.extract}</span>
        <span className="inline-flex items-center gap-1 text-xs text-dim">
          <ExternalLink className="size-3" aria-hidden />
          {info.lang === "he" ? "ויקיפדיה" : "Wikipedia"}
        </span>
      </span>
    </a>
  )
}

const ACTION = "flex min-h-11 flex-1 basis-[30%] items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold"

export function PlaceCard({ p, d, origin, planDate }: { p: Place; d: number; origin: Origin; planDate: string }) {
  const openId = useUi((s) => s.openId)
  const setUi = useUi((s) => s.setUi)
  const showToast = useUi((s) => s.showToast)
  const fav = useTreasure((s) => !!s.fav[p.id])
  const visited = useTreasure((s) => !!s.vis[p.id])
  const inPlan = useTreasure((s) => (s.plans[planDate] ?? []).includes(p.id))
  const toggle = useTreasure((s) => s.toggle)
  const togglePlan = useTreasure((s) => s.togglePlan)
  const open = openId === p.id
  const cat = mainCat(p)
  const area = AREAS[p.area]
  const catLabels = p.cats
    .filter((c) => c !== "special")
    .slice(0, 2)
    .map((c) => CATS[c]?.he)
    .join(" · ")

  const onPlan = () => {
    const added = togglePlan(planDate, p.id)
    showToast(added ? `נוסף לתוכנית של ${dateShort(planDate)}` : "הוסר מהתוכנית")
  }
  const onFav = () => {
    toggle("fav", p.id)
    showToast(fav ? "הוסר מהשמורים" : "נשמר")
  }
  const share = async () => {
    const url = `${location.origin}${location.pathname}?place=${encodeURIComponent(p.id)}`
    try {
      if (navigator.share) await navigator.share({ title: p.he, text: `${p.en} - ${p.he}`, url })
      else {
        await navigator.clipboard.writeText(url)
        showToast("הקישור הועתק")
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  return (
    <article
      id={`place-${p.id}`}
      style={{ "--c": cat.color } as React.CSSProperties}
      className={`scroll-mt-40 overflow-hidden rounded-2xl border bg-card transition-colors ${
        p.mustSee ? "border-gold/50" : "border-line"
      } ${visited ? "opacity-70" : ""}`}
    >
      <div className="flex">
        <button
          type="button"
          onClick={() => setUi({ openId: open ? null : p.id })}
          aria-expanded={open}
          className="flex min-w-0 flex-1 gap-3 p-3 text-start"
        >
          <span className="tile grid size-12 shrink-0 place-items-center rounded-xl">
            <Glyph name={cat.icon} className="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[11px] font-semibold text-muted">
              {catLabels} · {area?.he}
            </span>
            <span dir="ltr" className="text-end text-[15px] leading-tight font-bold">
              {p.en}
            </span>
            <span className="text-sm leading-tight">{p.he}</span>
            <span className="flex flex-wrap gap-1">
              <PlaceTags p={p} />
            </span>
            <span className={`text-sm text-muted ${open ? "" : "line-clamp-2"}`}>{p.desc}</span>
            <MetaRow p={p} d={d} />
          </span>
        </button>
        <div className="flex shrink-0 flex-col gap-1 p-2">
          <button
            type="button"
            onClick={onFav}
            aria-pressed={fav}
            aria-label={fav ? "להסיר מהשמורים" : "לשמור"}
            className={`grid size-11 place-items-center rounded-xl ${fav ? "text-red" : "text-dim"}`}
          >
            <Heart className="size-5" fill={fav ? "currentColor" : "none"} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onPlan}
            aria-pressed={inPlan}
            aria-label={inPlan ? "להסיר מהתוכנית" : "להוסיף לתוכנית"}
            className={`grid size-11 place-items-center rounded-xl ${inPlan ? "bg-gold text-gold-ink" : "text-dim"}`}
          >
            {inPlan ? <Check className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-3 pt-3 pb-3">
          {p.tip && <p className="rounded-xl bg-gold/10 px-3 py-2 text-sm">💡 {p.tip}</p>}
          <HowTo p={p} origin={origin} />
          {p.hardOff?.googleRating ? (
            <span className="self-start rounded-full bg-card-2 px-3 py-1 text-xs text-muted">
              Google {p.hardOff.googleRating} · {p.hardOff.reviewCount} ביקורות
            </span>
          ) : null}
          <WikiBox p={p} />
          <div className="flex flex-wrap gap-2">
            <a href={mapsUrl(p)} target="_blank" rel="noopener noreferrer" className={`${ACTION} border-gold bg-gold text-gold-ink`}>
              <MapPin className="size-4" aria-hidden />
              מפה
            </a>
            <a href={directionsUrl(p, origin, d)} target="_blank" rel="noopener noreferrer" className={`${ACTION} border-line`}>
              <Navigation className="size-4" aria-hidden />
              מסלול
            </a>
            <a href={imagesUrl(p)} target="_blank" rel="noopener noreferrer" className={`${ACTION} border-line`}>
              <ImageIcon className="size-4" aria-hidden />
              תמונות
            </a>
            <button type="button" onClick={onFav} aria-pressed={fav} className={`${ACTION} ${fav ? "border-red text-red" : "border-line"}`}>
              <Heart className="size-4" fill={fav ? "currentColor" : "none"} aria-hidden />
              {fav ? "שמור" : "לשמור"}
            </button>
            <button type="button" onClick={onPlan} aria-pressed={inPlan} className={`${ACTION} ${inPlan ? "border-gold text-gold" : "border-line"}`}>
              <CalendarPlus className="size-4" aria-hidden />
              {inPlan ? "בתוכנית" : "לתוכנית"}
            </button>
            <button
              type="button"
              onClick={() => toggle("vis", p.id)}
              aria-pressed={visited}
              className={`${ACTION} ${visited ? "border-ok text-ok" : "border-line"}`}
            >
              <Check className="size-4" aria-hidden />
              {visited ? "ביקרנו" : "ביקרנו?"}
            </button>
            <button type="button" onClick={share} className={`${ACTION} border-line`}>
              <Share2 className="size-4" aria-hidden />
              שיתוף
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
