import { create } from "zustand"
import { persist } from "zustand/middleware"

interface WaypointsVisibilityState {
  showWaypoints: boolean
  toggle: () => void
}

export const useWaypointsVisibilityStore = create<WaypointsVisibilityState>()(
  persist(
    (set) => ({
      showWaypoints: true,
      toggle: () => set((state) => ({ showWaypoints: !state.showWaypoints })),
    }),
    { name: "japan-trip-show-waypoints" }
  )
)
