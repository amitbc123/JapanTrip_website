import { AREAS, CATS, GROUPS, PLACES, isFood } from "@/treasure/data"
import { km } from "@/treasure/lib/core"
import type { SortKey, Toggle } from "@/treasure/store"
import type { CategoryKey, LatLon, Place, Region } from "@/treasure/types"

export interface Scored {
  p: Place
  d: number
}

export interface FilterInput {
  region: Region
  origin: LatLon
  area: string
  group: string
  cats: string[]
  query: string
  tog: Partial<Record<Toggle, boolean>>
  sort: SortKey
  visited: Record<string, true>
}

export function groupCats(group: string, cats: string[]): string[] {
  const g = GROUPS.find((x) => x.key === group)
  if (!g) return []
  return cats.length ? cats : g.cats
}

function searchText(p: Place): string {
  return `${p.en} ${p.he} ${p.desc} ${p.tip} ${p.cats.map((c) => CATS[c]?.he ?? "").join(" ")} ${AREAS[p.area]?.he ?? ""}`.toLowerCase()
}
const SEARCH = new Map(PLACES.map((p) => [p.id, searchText(p)]))

/** Region, area, topic, search and toggles, sorted. */
export function filterPlaces(f: FilterInput): Scored[] {
  const sel = new Set(groupCats(f.group, f.cats))
  const q = f.query.trim().toLowerCase()
  const t = f.tog
  let list = PLACES.filter((p) => p.region === f.region.key)
  if (f.area) list = list.filter((p) => p.area === f.area)
  if (sel.size) list = list.filter((p) => p.cats.some((c) => sel.has(c)))
  if (q) list = list.filter((p) => SEARCH.get(p.id)!.includes(q))
  if (t.must) list = list.filter((p) => p.mustSee)
  if (t.noSeafood) list = list.filter((p) => !isFood(p) || p.seafood === "none")
  if (t.dairySafe) list = list.filter((p) => !isFood(p) || p.dairy === "free" || p.dairy === "ask")
  if (t.hidevis) list = list.filter((p) => !f.visited[p.id])
  let scored = list.map((p) => ({ p, d: km(f.origin, p) }))
  if (t.near) scored = scored.filter((x) => x.d <= 1.6)
  if (t.mid) scored = scored.filter((x) => x.d <= 8)
  const hs = (p: Place) => p.hardOff?.score ?? -1
  if (f.sort === "dist") scored.sort((a, b) => a.d - b.d)
  else if (f.sort === "must")
    scored.sort((a, b) => Number(b.p.mustSee) - Number(a.p.mustSee) || Math.max(hs(b.p), 0) - Math.max(hs(a.p), 0) || a.d - b.d)
  else if (f.sort === "hs") scored.sort((a, b) => hs(b.p) - hs(a.p) || a.d - b.d)
  else scored.sort((a, b) => a.p.en.localeCompare(b.p.en))
  return scored
}

/** What fits the hour (Japan time). */
export function timeOfDay(h: number): { want: CategoryKey[]; label: string } {
  if (h < 11) return { want: ["temple", "sight", "park", "street"], label: "בוקר טוב: מה לעשות עכשיו" }
  if (h < 14) return { want: ["food", "street"], label: "זמן צהריים: אוכל קרוב" }
  if (h < 17) return { want: ["op", "anime", "hardoff", "shop", "museum", "eva"], label: "אחר הצהריים: קניות ואנימה" }
  if (h < 21) return { want: ["food", "sight", "night", "arcade"], label: "ערב: אוכל, נוף ולילה" }
  return { want: ["night", "arcade", "onsen", "food"], label: "לילה: מה עוד פתוח" }
}

/** Unvisited places for the hour, widening 3 → 8 → 25 km until there are enough. */
export function suggestionsFor(region: Region, origin: LatLon, hour: number, visited: Record<string, true>): Scored[] {
  const { want } = timeOfDay(hour)
  const pool = PLACES.filter(
    (p) => p.region === region.key && !visited[p.id] && p.cats.some((c) => want.includes(c)) && (!isFood(p) || p.seafood !== "mostly")
  ).map((p) => ({ p, d: km(origin, p) }))
  let near = pool.filter((x) => x.d < 3)
  if (near.length < 4) near = pool.filter((x) => x.d < 8)
  if (near.length < 4) near = pool.filter((x) => x.d < 25)
  return near.sort((a, b) => (Number(b.p.mustSee) - Number(a.p.mustSee)) * 1.5 + (a.d - b.d)).slice(0, 8)
}

export function closestUnvisited(region: Region, origin: LatLon, visited: Record<string, true>, n = 10): Scored[] {
  return PLACES.filter((p) => p.region === region.key && !visited[p.id])
    .map((p) => ({ p, d: km(origin, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
}

export interface AutoBuildOptions {
  cats: string[]
  radiusKm: number
  stops: number
  meal: boolean
}

/** Picks stops for a day: must-see +4, Hard Off score × 0.6, One Piece +1.5,
 *  -0.25 per km from the hotel, plus a little randomness; then a meal with
 *  no seafood and no "contains dairy" near the middle of the picks. */
export function autoBuild(region: Region, base: LatLon, opts: AutoBuildOptions, exclude: Set<string>, visited: Record<string, true>): Place[] {
  const pool = PLACES.filter((p) => p.region === region.key && !visited[p.id] && !exclude.has(p.id) && km(base, p) <= opts.radiusKm)
  const nonFood = pool.filter((p) => !isFood(p) && (!opts.cats.length || p.cats.some((c) => opts.cats.includes(c))))
  const score = (p: Place) =>
    (p.mustSee ? 4 : 0) + (p.hardOff?.score ?? 0) * 0.6 + (p.cats.includes("op") ? 1.5 : 0) - km(base, p) * 0.25 + Math.random() * 0.8
  const scored = nonFood.map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s)
  const pick = scored.slice(0, opts.meal ? opts.stops - 1 : opts.stops).map((x) => x.p)
  if (opts.meal) {
    const center = pick.length
      ? { lat: pick.reduce((s, p) => s + p.lat, 0) / pick.length, lon: pick.reduce((s, p) => s + p.lon, 0) / pick.length }
      : base
    const meal = pool
      .filter((p) => isFood(p) && p.seafood === "none" && p.dairy !== "contains")
      .sort((a, b) => km(center, a) - (a.mustSee ? 1 : 0) - (km(center, b) - (b.mustSee ? 1 : 0)))[0]
    if (meal) pick.push(meal)
  }
  return pick
}
