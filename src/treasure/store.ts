import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"
import type { RegionKey } from "@/treasure/types"

export type SortKey = "dist" | "must" | "hs" | "name"
export type Toggle = "must" | "hidevis" | "near" | "mid" | "noSeafood" | "dairySafe"
export type Tab = "explore" | "plan" | "saved" | "cards"
export type ViewMode = "list" | "map"

export interface ManualLocation {
  lat: number
  lon: number
  label: string
  /** ms epoch; a manual location is kept for 6 hours. */
  at: number
}

export const MANUAL_LOCATION_MS = 6 * 60 * 60 * 1000

interface TreasureState {
  fav: Record<string, true>
  vis: Record<string, true>
  /** Place ids per trip date. */
  plans: Record<string, string[]>
  /** Hotel picked by hand per region (Tokyo has two). */
  base: Partial<Record<RegionKey, string>>
  /** Sub-area chip per region ("" = all). */
  area: Partial<Record<RegionKey, string>>
  tog: Partial<Record<Toggle, boolean>>
  sort: SortKey
  view: ViewMode
  /** Measure from my location when I'm inside the region. */
  useLoc: boolean
  manual: ManualLocation | null
  toggle: (kind: "fav" | "vis", id: string) => void
  setPlan: (date: string, ids: string[]) => void
  togglePlan: (date: string, id: string) => boolean
  set: (patch: Partial<Pick<TreasureState, "base" | "area" | "tog" | "sort" | "view" | "useLoc" | "manual">>) => void
}

/** localStorage that never throws (private mode, blocked storage). */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage unavailable: keep working in memory */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

export const useTreasure = create<TreasureState>()(
  persist(
    (set, get) => ({
      fav: {},
      vis: {},
      plans: {},
      base: {},
      area: {},
      tog: {},
      sort: "dist",
      view: "list",
      useLoc: true,
      manual: null,
      toggle: (kind, id) => {
        const next = { ...get()[kind] }
        if (next[id]) delete next[id]
        else next[id] = true
        set({ [kind]: next })
      },
      setPlan: (date, ids) => set({ plans: { ...get().plans, [date]: ids } }),
      togglePlan: (date, id) => {
        const list = get().plans[date] ?? []
        const has = list.includes(id)
        set({ plans: { ...get().plans, [date]: has ? list.filter((x) => x !== id) : [...list, id] } })
        return !has
      },
      set: (patch) => set(patch),
    }),
    { name: "treasure-v2", storage: createJSONStorage(() => safeStorage), version: 1 }
  )
)

/** Session-only UI state (not persisted). */
interface UiState {
  tab: Tab
  /** Region shown; null = automatic (location, else date). */
  region: RegionKey | null
  group: string
  cats: string[]
  query: string
  openId: string | null
  /** Place picked on the map (mini card). */
  mapPick: string | null
  planDate: string | null
  locationSheet: { open: boolean; message: string | null }
  toast: { text: string; n: number } | null
  setUi: (patch: Partial<Omit<UiState, "setUi" | "showToast" | "openLocation">>) => void
  showToast: (text: string) => void
  openLocation: (message?: string | null) => void
}

export const useUi = create<UiState>((set, get) => ({
  tab: "explore",
  region: null,
  group: "",
  cats: [],
  query: "",
  openId: null,
  mapPick: null,
  planDate: null,
  locationSheet: { open: false, message: null },
  toast: null,
  setUi: (patch) => set(patch),
  showToast: (text) => {
    const n = (get().toast?.n ?? 0) + 1
    set({ toast: { text, n } })
    window.setTimeout(() => {
      if (get().toast?.n === n) set({ toast: null })
    }, 1900)
  },
  openLocation: (message = null) => set({ locationSheet: { open: true, message } }),
}))
