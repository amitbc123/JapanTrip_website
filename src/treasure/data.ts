import areasRaw from "@/treasure/data/areas.json"
import categoriesRaw from "@/treasure/data/categories.json"
import groupsRaw from "@/treasure/data/groups.json"
import iconsRaw from "@/treasure/data/icons.json"
import phrasesRaw from "@/treasure/data/phrases.json"
import placesRaw from "@/treasure/data/places.json"
import regionsRaw from "@/treasure/data/regions.json"
import stationsRaw from "@/treasure/data/stations.json"
import type { Area, Category, CategoryKey, Phrase, Place, Region, Station, TopicGroup } from "@/treasure/types"

export const REGIONS = regionsRaw as Region[]
export const AREAS = areasRaw as Record<string, Area>
export const CATEGORIES = categoriesRaw as Category[]
export const CATS = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<CategoryKey, Category>
export const GROUPS = groupsRaw as TopicGroup[]
export const ICONS = iconsRaw as Record<string, string>
export const PHRASES = phrasesRaw as Phrase[]
export const STATIONS = stationsRaw as Station[]

/** "Only in this city" is a category of its own in the filters. */
export const PLACES: Place[] = (placesRaw as Place[]).map((p) =>
  p.special && !p.cats.includes("special") ? { ...p, cats: [...p.cats, "special"] } : p
)
export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]))

export const TRIP_END = "2026-12-06"

/** SVG markup of a glyph, for Leaflet div icons. */
export function glyphHtml(name: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ""}</svg>`
}

export function isFood(p: Place): boolean {
  return p.cats.includes("food") || p.cats.includes("street")
}

/** The category that decides a place's colour and icon: its first real one. */
export function mainCat(p: Place): Category {
  const key = p.cats.find((c) => c !== "special") ?? p.cats[0] ?? "sight"
  return CATS[key] ?? CATS.sight
}

/** English city name for Google searches. */
export function cityEn(p: Place): string {
  const byArea: Record<string, string> = {
    ngy: "Nagoya",
    tokoname: "Tokoname",
    kyo: "Kyoto",
    nara: "Nara",
    uji: "Uji",
    osk: "Osaka",
    kobe: "Kobe",
    himeji: "Himeji",
    hiro: "Hiroshima",
    miya: "Miyajima",
    kum: "Kumamoto",
    aso: "Kumamoto",
    kamakura: "Kamakura",
    takao: "Hachioji",
    kawaguchi: "Fujikawaguchiko",
    chichibu: "Chichibu",
    tama: "Tama",
    machida: "Machida",
  }
  return byArea[p.area] ?? "Tokyo"
}
