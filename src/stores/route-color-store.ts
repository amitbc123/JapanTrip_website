import { create } from "zustand"
import { persist } from "zustand/middleware"

export const DEFAULT_ROUTE_COLOR = "#1F3A5F"

interface RouteColorState {
  color: string
  setColor: (color: string) => void
}

export const useRouteColorStore = create<RouteColorState>()(
  persist(
    (set) => ({
      color: DEFAULT_ROUTE_COLOR,
      setColor: (color) => set({ color }),
    }),
    { name: "japan-trip-route-color" }
  )
)
