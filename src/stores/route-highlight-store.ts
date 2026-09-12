import { create } from "zustand"

interface RouteHighlightState {
  highlightedKey: string | null
  /** Returns true if the key just became the selected one, false if it was deselected. */
  toggle: (key: string) => boolean
}

export const useRouteHighlightStore = create<RouteHighlightState>((set, get) => ({
  highlightedKey: null,
  toggle: (key) => {
    const turningOn = get().highlightedKey !== key
    set({ highlightedKey: turningOn ? key : null })
    return turningOn
  },
}))
