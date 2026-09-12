import { create } from "zustand"
import { persist } from "zustand/middleware"

export const DEFAULT_BACKGROUND_COLOR = "#faf6ee"

function applyBackgroundColor(color: string) {
  document.documentElement.style.setProperty("--background", color)
}

interface BackgroundColorState {
  color: string
  setColor: (color: string) => void
}

export const useBackgroundColorStore = create<BackgroundColorState>()(
  persist(
    (set) => ({
      color: DEFAULT_BACKGROUND_COLOR,
      setColor: (color) => {
        applyBackgroundColor(color)
        set({ color })
      },
    }),
    {
      name: "japan-trip-background-color",
      onRehydrateStorage: () => (state) => {
        if (state) applyBackgroundColor(state.color)
      },
    }
  )
)
