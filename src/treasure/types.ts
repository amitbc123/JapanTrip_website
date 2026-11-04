export type CategoryKey =
  | "special"
  | "manhole"
  | "op"
  | "eva"
  | "anime"
  | "hardoff"
  | "vintage"
  | "tech"
  | "food"
  | "street"
  | "shop"
  | "mall"
  | "sight"
  | "temple"
  | "park"
  | "animals"
  | "museum"
  | "quirky"
  | "night"
  | "arcade"
  | "onsen"

export type RegionKey = "ngy" | "kyo" | "osk" | "hiro" | "kum" | "tky"

/** One place, as written by scripts/migrate-treasure.mjs. */
export interface Place {
  /** Stable slug of the English name and area. */
  id: string
  area: string
  region: RegionKey
  /** Includes "special" when the place is one this city is known for. */
  cats: CategoryKey[]
  en: string
  he: string
  lat: number
  lon: number
  desc: string
  tip: string
  /** 0 free, 1-3 = ¥ to ¥¥¥, null unknown. */
  price: 0 | 1 | 2 | 3 | null
  mustSee: boolean
  special: boolean
  /** Food only: "none" = fine without seafood, "mostly" = mostly seafood. */
  seafood: "none" | "mostly" | null
  /** Food only: usual dairy status; null = unknown. */
  dairy: "free" | "ask" | "contains" | null
  hardOff?: { score: number | null; googleRating: number | null; reviewCount: number | null }
}

export interface Station {
  name: string
  lat: number
  lon: number
  lines: string[]
}

export interface Base {
  key: string
  name: string
  lat: number
  lon: number
  from: string
  to: string
}

export interface Region {
  key: RegionKey
  he: string
  kanji: string
  /** Inclusive start, exclusive end ("YYYY-MM-DD", Japan dates). */
  from: string
  to: string
  areas: string[]
  bases: Base[]
}

export interface Area {
  he: string
  /** How to get there from the base city (day-trip areas only). */
  trip?: string
}

export interface Category {
  key: CategoryKey
  he: string
  /** Label used in the sub-filter row. */
  sub: string
  color: string
  dark: string
  icon: string
}

export interface TopicGroup {
  key: string
  he: string
  color: string
  icon: string
  cats: CategoryKey[]
}

export interface Phrase {
  jp: string
  romaji: string
  he: string
}

export interface LatLon {
  lat: number
  lon: number
}

/** Where distances are measured from. */
export interface Origin extends LatLon {
  label: string
  /** True when it's the user (live or manual), false for the hotel. */
  me: boolean
  manual: boolean
}
