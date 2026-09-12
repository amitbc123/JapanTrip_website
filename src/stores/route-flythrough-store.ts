import { create } from "zustand"

interface RouteFlythroughState {
  isPlaying: boolean
  /** Start/stop toggle for the button. */
  toggle: () => void
  /** Called by the animation itself on natural completion, so the button's
   *  state resets without requiring another click. */
  stop: () => void
}

export const useRouteFlythroughStore = create<RouteFlythroughState>((set, get) => ({
  isPlaying: false,
  toggle: () => set({ isPlaying: !get().isPlaying }),
  stop: () => set({ isPlaying: false }),
}))
