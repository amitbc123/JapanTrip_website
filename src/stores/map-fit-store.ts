import { create } from "zustand"

interface MapFitState {
  requestId: number
  requestFit: () => void
}

export const useMapFitStore = create<MapFitState>((set) => ({
  requestId: 0,
  requestFit: () => set((s) => ({ requestId: s.requestId + 1 })),
}))
