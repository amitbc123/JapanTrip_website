import { create } from "zustand"
import { persist } from "zustand/middleware"

interface DictionaryFavoritesState {
  ids: string[]
  toggle: (id: string) => void
}

/** Phrases starred on the dictionary page — per device, like the other
 *  view preferences. */
export const useDictionaryFavoritesStore = create<DictionaryFavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] })),
    }),
    { name: "japan-trip-dictionary-favorites" }
  )
)
