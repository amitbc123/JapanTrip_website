import { create } from "zustand"

interface RouteHighlightState {
  highlighted: Set<string>
  toggle: (key: string) => boolean
}

export const useRouteHighlightStore = create<RouteHighlightState>((set, get) => ({
  highlighted: new Set(),
  toggle: (key) => {
    const next = new Set(get().highlighted)
    const turningOn = !next.has(key)
    if (turningOn) next.add(key)
    else next.delete(key)
    set({ highlighted: next })
    return turningOn
  },
}))
