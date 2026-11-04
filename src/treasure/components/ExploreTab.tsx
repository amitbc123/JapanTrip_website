import { BedDouble, List, LocateFixed, Map as MapIcon, Search, SlidersHorizontal, Footprints, TrainFront, X } from "lucide-react"
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Glyph } from "@/treasure/components/Icon"
import { MetaRow, PlaceCard, PlaceTags } from "@/treasure/components/PlaceCard"
import { Sheet } from "@/treasure/components/Sheet"
import { AREAS, CATS, GROUPS, PLACES, PLACE_BY_ID, mainCat } from "@/treasure/data"
import { dateShort, directionsUrl, fmtKm, fmtMin, km, searchAroundUrl, transitMin, walkMin } from "@/treasure/lib/core"
import { closestUnvisited, filterPlaces, suggestionsFor, timeOfDay, type Scored } from "@/treasure/lib/explore"
import type { TripContext } from "@/treasure/lib/hooks"
import { AROUND_SEARCHES, useOnline } from "@/treasure/lib/online"
import { useTreasure, useUi, type SortKey, type Toggle } from "@/treasure/store"

const ExploreMap = lazy(() => import("@/treasure/components/ExploreMap").then((m) => ({ default: m.ExploreMap })))

const PAGE = 40

function SuggestionRow({ title, sub, items }: { title: string; sub: string; items: Scored[] }) {
  const jump = useJump()
  if (!items.length) return null
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        <span className="text-xs text-muted">{sub}</span>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
        {items.map(({ p, d }) => {
          const cat = mainCat(p)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => jump(p.id)}
              style={{ "--c": cat.color } as React.CSSProperties}
              className="flex w-44 shrink-0 snap-start flex-col items-start gap-1 rounded-2xl border border-line bg-card p-3 text-start"
            >
              <span className="tile flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
                <Glyph name={cat.icon} className="size-3.5" />
                {cat.he}
                {p.mustSee ? " · חובה" : ""}
              </span>
              <b dir="ltr" className="line-clamp-2 w-full text-end text-sm leading-tight">
                {p.en}
              </b>
              <span className="line-clamp-1 text-xs text-muted">{p.he}</span>
              <span className="mt-auto flex items-center gap-1 text-xs text-muted">
                {fmtKm(d)} ·{" "}
                {d <= 4 ? (
                  <>
                    <Footprints className="size-3" aria-hidden /> {fmtMin(walkMin(d))}
                  </>
                ) : (
                  <>
                    <TrainFront className="size-3" aria-hidden /> {fmtMin(transitMin(d))}
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Opens a place's card in the list view: clears filters that would hide it. */
function useJump() {
  const setUi = useUi((s) => s.setUi)
  const setStore = useTreasure((s) => s.set)
  return (id: string) => {
    const p = PLACE_BY_ID.get(id)
    if (!p) return
    const area = useTreasure.getState().area
    setStore({ view: "list", area: { ...area, [p.region]: "" } })
    setUi({ openId: id, group: "", cats: [], query: "", mapPick: null, region: p.region })
    window.setTimeout(() => document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80)
  }
}

const CHIP = "chip min-h-11 rounded-full border border-line bg-card px-4 text-sm font-semibold"

function ToggleChip({ k, label }: { k: Toggle; label: string }) {
  const tog = useTreasure((s) => s.tog)
  const set = useTreasure((s) => s.set)
  const flip = () => {
    const next = { ...tog, [k]: !tog[k] }
    if (k === "near" && next.near) next.mid = false
    if (k === "mid" && next.mid) next.near = false
    set({ tog: next })
  }
  return (
    <button type="button" className={CHIP} aria-pressed={!!tog[k]} onClick={flip}>
      {label}
    </button>
  )
}

function FilterSheet({ open, onOpenChange, originIsMe }: { open: boolean; onOpenChange: (o: boolean) => void; originIsMe: boolean }) {
  const sort = useTreasure((s) => s.sort)
  const set = useTreasure((s) => s.set)
  const sorts: [SortKey, string][] = [
    ["dist", "הכי קרוב"],
    ["must", "חובה קודם"],
    ["hs", "דירוג Hard Off"],
    ["name", "לפי שם"],
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="סינון ומיון">
      <div className="flex flex-col gap-5 pb-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold text-muted">הצג רק</legend>
          <div className="flex flex-wrap gap-2">
            <ToggleChip k="must" label="מקומות חובה" />
            <ToggleChip k="hidevis" label="שעוד לא ביקרנו" />
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold text-muted">מרחק {originIsMe ? "ממך" : "מהמלון"}</legend>
          <div className="flex flex-wrap gap-2">
            <ToggleChip k="near" label="ברגל, עד 1.6 ק״מ" />
            <ToggleChip k="mid" label="עד 8 ק״מ" />
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold text-muted">אוכל</legend>
          <div className="flex flex-wrap gap-2">
            <ToggleChip k="noSeafood" label="בלי פירות ים" />
            <ToggleChip k="dairySafe" label="בלי חלב (או לשאול)" />
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold text-muted">מיון</legend>
          <div className="flex flex-wrap gap-2">
            {sorts.map(([k, label]) => (
              <button key={k} type="button" className={CHIP} aria-pressed={sort === k} onClick={() => set({ sort: k })}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-12 flex-1 rounded-2xl border border-line font-semibold"
            onClick={() => {
              set({ tog: {}, sort: "dist" })
              useUi.getState().setUi({ group: "", cats: [] })
            }}
          >
            איפוס
          </button>
          <button type="button" className="min-h-12 flex-1 rounded-2xl bg-gold font-bold text-gold-ink" onClick={() => onOpenChange(false)}>
            הצג תוצאות
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function MapPickCard({ origin, planDate }: { origin: TripContext["origin"]; planDate: string }) {
  const pick = useUi((s) => s.mapPick)
  const jump = useJump()
  const p = pick ? PLACE_BY_ID.get(pick) : undefined
  void planDate
  if (!p) return <p className="px-1 text-center text-xs text-muted">לחיצה על נעץ מציגה את המקום. עיגול זהב עם מספר = כמה מקומות קרובים, לחיצה מתקרבת.</p>
  const d = km(origin, p)
  const cat = mainCat(p)
  return (
    <div style={{ "--c": cat.color } as React.CSSProperties} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <span className="tile grid size-11 shrink-0 place-items-center rounded-xl">
        <Glyph name={cat.icon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b dir="ltr" className="truncate text-end text-sm">
          {p.en}
        </b>
        <span className="truncate text-xs">{p.he}</span>
        <span className="flex flex-wrap gap-1">
          <PlaceTags p={p} />
        </span>
        <MetaRow p={p} d={d} />
      </span>
      <div className="flex shrink-0 flex-col gap-1.5">
        <button type="button" onClick={() => jump(p.id)} className="min-h-10 rounded-xl bg-gold px-3 text-sm font-bold text-gold-ink">
          פרטים
        </button>
        <a href={directionsUrl(p, origin, d)} target="_blank" rel="noopener noreferrer" className="grid min-h-10 place-items-center rounded-xl border border-line px-3 text-sm font-semibold">
          מסלול
        </a>
      </div>
    </div>
  )
}

function AroundSearches({ origin }: { origin: TripContext["origin"] }) {
  const online = useOnline()
  if (!online || !origin.me) return null
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">לחפש סביבי עכשיו</h2>
        <span className="text-xs text-muted">ב-Google Maps</span>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {AROUND_SEARCHES.map((s) => (
          <a
            key={s.label}
            href={searchAroundUrl(s.query, origin)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 shrink-0 items-center rounded-full border border-line bg-card px-3.5 text-sm font-semibold"
          >
            {s.label}
          </a>
        ))}
      </div>
    </section>
  )
}

export function ExploreTab({ ctx, planDate }: { ctx: TripContext; planDate: string }) {
  const { region, origin, base, now } = ctx
  const group = useUi((s) => s.group)
  const cats = useUi((s) => s.cats)
  const query = useUi((s) => s.query)
  const openId = useUi((s) => s.openId)
  const setUi = useUi((s) => s.setUi)
  const openLocation = useUi((s) => s.openLocation)
  const areaByRegion = useTreasure((s) => s.area)
  const tog = useTreasure((s) => s.tog)
  const sort = useTreasure((s) => s.sort)
  const view = useTreasure((s) => s.view)
  const visited = useTreasure((s) => s.vis)
  const setStore = useTreasure((s) => s.set)
  const baseByRegion = useTreasure((s) => s.base)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)
  const area = areaByRegion[region.key] ?? ""
  // Typing stays instant; the list catches up a beat later.
  const deferredQuery = useDeferredValue(query)

  const list = useMemo(
    () => filterPlaces({ region, origin, area, group, cats, query: deferredQuery, tog, sort, visited }),
    [region, origin, area, group, cats, deferredQuery, tog, sort, visited]
  )
  const signature = `${region.key}|${area}|${group}|${cats.join(",")}|${deferredQuery}|${JSON.stringify(tog)}`
  // Cards rendered so far (grows while scrolling), reset when the results change.
  const [paging, setPaging] = useState({ signature, n: PAGE })
  const shown = paging.signature === signature ? paging.n : PAGE
  const openIndex = openId ? list.findIndex((x) => x.p.id === openId) : -1
  const limit = Math.max(shown, openIndex + 10)

  // Load more as the end of the list comes into view.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setPaging({ signature, n: limit + PAGE })
    })
    io.observe(el)
    return () => io.disconnect()
  }, [list.length, view, signature, limit])

  const inRegion = useMemo(() => PLACES.filter((p) => p.region === region.key), [region.key])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    inRegion.forEach((p) => p.cats.forEach((k) => (c[k] = (c[k] ?? 0) + 1)))
    return c
  }, [inRegion])
  const groupCount = (cs: string[]) => inRegion.filter((p) => p.cats.some((c) => cs.includes(c))).length
  const activeGroup = GROUPS.find((g) => g.key === group)
  const regionAreas = region.areas.filter((a) => inRegion.some((p) => p.area === a))
  const showSuggestions = !query && !group
  const live = now.date >= region.from && now.date < region.to
  const nFilters = Object.values(tog).filter(Boolean).length + (sort !== "dist" ? 1 : 0)
  const { label: hourLabel } = timeOfDay(now.h)

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-[600] -mx-4 flex flex-col gap-2 border-b border-line bg-sea/95 px-4 pt-2 pb-2.5 backdrop-blur">
        <div className="flex gap-2">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-line bg-card px-3">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setUi({ query: e.target.value })}
              placeholder={`חיפוש ב${region.he}: שם, אוכל, אנימה…`}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-dim"
              aria-label="חיפוש מקומות"
            />
            {query && (
              <button type="button" onClick={() => setUi({ query: "" })} aria-label="ניקוי החיפוש" className="grid size-8 place-items-center text-muted">
                <X className="size-4" aria-hidden />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label="סינון ומיון"
            className={`relative grid size-11 shrink-0 place-items-center rounded-2xl border ${nFilters ? "border-gold bg-gold/15 text-gold" : "border-line bg-card"}`}
          >
            <SlidersHorizontal className="size-5" aria-hidden />
            {nFilters > 0 && (
              <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-gold-ink">{nFilters}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStore({ view: view === "map" ? "list" : "map" })}
            aria-label={view === "map" ? "תצוגת רשימה" : "תצוגת מפה"}
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-card"
          >
            {view === "map" ? <List className="size-5" aria-hidden /> : <MapIcon className="size-5" aria-hidden />}
          </button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="נושאים">
          <button type="button" className="chip flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-line bg-card px-3.5 text-sm font-semibold" aria-pressed={!group} onClick={() => setUi({ group: "", cats: [] })}>
            הכל <small className="opacity-70">{inRegion.length}</small>
          </button>
          {GROUPS.map((g) => {
            const n = groupCount(g.cats)
            if (!n) return null
            return (
              <button
                key={g.key}
                type="button"
                style={{ "--c": g.color } as React.CSSProperties}
                className="chip-cat flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-sm font-semibold"
                aria-pressed={group === g.key}
                onClick={() => setUi({ group: group === g.key ? "" : g.key, cats: [] })}
              >
                <span style={{ color: g.color }}>
                  <Glyph name={g.icon} className="size-4" />
                </span>
                {g.key === "special" ? `רק ב${region.he}` : g.he} <small className="opacity-70">{n}</small>
              </button>
            )
          })}
        </div>
        {activeGroup && activeGroup.cats.filter((c) => counts[c]).length > 1 && (
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4" role="group" aria-label="סינון משנה">
            <button type="button" className="chip min-h-9 shrink-0 rounded-full border border-line bg-card px-3 text-xs font-semibold" aria-pressed={!cats.length} onClick={() => setUi({ cats: [] })}>
              הכל
            </button>
            {activeGroup.cats
              .filter((c) => counts[c])
              .map((c) => {
                const on = cats.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    style={{ "--c": CATS[c].color } as React.CSSProperties}
                    className="chip-cat flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-semibold"
                    aria-pressed={on}
                    onClick={() => setUi({ cats: on ? cats.filter((x) => x !== c) : [...cats, c] })}
                  >
                    <span className="size-2.5 rounded-full" style={{ background: CATS[c].color }} aria-hidden />
                    {CATS[c].sub} <small className="opacity-70">{counts[c]}</small>
                  </button>
                )
              })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
          {origin.me ? <LocateFixed className="size-5" aria-hidden /> : <BedDouble className="size-5" aria-hidden />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          {origin.me ? (
            <b className="text-sm">{origin.manual ? origin.label : "המיקום שלך"}</b>
          ) : (
            <b dir="ltr" className="truncate text-end text-sm">
              {base.name}
            </b>
          )}
          <span className="text-xs text-muted">
            {origin.me ? "המרחקים מחושבים ממך עכשיו" : `המרחקים מחושבים מהמלון · ${dateShort(base.from)} - ${dateShort(base.to)}`}
          </span>
        </span>
        {region.bases.length > 1 && !origin.me ? (
          <div className="flex shrink-0 rounded-xl border border-line p-0.5" role="group" aria-label="בחירת מלון">
            {region.bases.map((b) => (
              <button
                key={b.key}
                type="button"
                aria-pressed={b.key === base.key}
                onClick={() => setStore({ base: { ...baseByRegion, [region.key]: b.key } })}
                className="chip min-h-9 rounded-lg px-2.5 text-xs font-semibold"
              >
                {b.key === "asa" ? "אסאקוסה" : "שינג'וקו"}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => openLocation()} className="shrink-0 rounded-xl border border-line px-3 py-2 text-xs font-semibold">
            שינוי
          </button>
        )}
      </div>

      {showSuggestions && origin.me && (
        <SuggestionRow
          title={origin.manual ? `קרוב ל${origin.label}` : "קרוב אליך עכשיו"}
          sub="לפי מרחק"
          items={closestUnvisited(region, origin, visited)}
        />
      )}
      {showSuggestions && (live || origin.me) && (
        <SuggestionRow title={hourLabel} sub={origin.me ? "לידך, לפי השעה" : "ליד המלון, לפי השעה"} items={suggestionsFor(region, origin, now.h, visited)} />
      )}
      {showSuggestions && <AroundSearches origin={origin} />}

      {regionAreas.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="אזורים">
          <button type="button" className="chip min-h-10 shrink-0 rounded-full border border-line bg-card px-3.5 text-sm font-semibold" aria-pressed={!area} onClick={() => setStore({ area: { ...areaByRegion, [region.key]: "" } })}>
            כל האזורים
          </button>
          {regionAreas.map((a) => (
            <button
              key={a}
              type="button"
              className="chip min-h-10 shrink-0 rounded-full border border-line bg-card px-3.5 text-sm font-semibold"
              aria-pressed={area === a}
              onClick={() => setStore({ area: { ...areaByRegion, [region.key]: area === a ? "" : a } })}
            >
              {AREAS[a]?.he}
              {AREAS[a]?.trip ? " · טיול יום" : ""}
            </button>
          ))}
        </div>
      )}
      {area && AREAS[area]?.trip && (
        <p className="flex items-start gap-2 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-sm">
          <TrainFront className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          {AREAS[area]!.trip}
        </p>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{view === "map" ? "על המפה" : "כל המקומות"}</h2>
        <span className="text-xs text-muted">
          {list.length} תוצאות · {({ dist: "לפי מרחק", must: "חובה קודם", hs: "דירוג Hard Off", name: "לפי שם" } as const)[sort]}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          לא נמצאו מקומות. נסו להסיר מסנן או לבחור אזור אחר.
        </p>
      ) : view === "map" ? (
        <div className="flex flex-col gap-3">
          <Suspense fallback={<div className="skeleton h-[min(62dvh,560px)] rounded-2xl" />}>
            <ExploreMap items={list} origin={origin} hotel={{ lat: base.lat, lon: base.lon, label: base.name }} signature={signature} />
          </Suspense>
          <MapPickCard origin={origin} planDate={planDate} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.slice(0, limit).map(({ p, d }) => (
            <PlaceCard key={p.id} p={p} d={d} origin={origin} planDate={planDate} />
          ))}
          {list.length > limit && <div ref={sentinel} className="skeleton h-24 rounded-2xl" aria-hidden />}
        </div>
      )}

      <p className="pb-2 text-center text-xs text-dim">זמני ההגעה הם הערכה לפי מרחק. למסלול מדויק לחצו על "מסלול".</p>
      <FilterSheet open={filtersOpen} onOpenChange={setFiltersOpen} originIsMe={origin.me} />
    </div>
  )
}
