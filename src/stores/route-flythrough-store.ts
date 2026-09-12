import { create } from "zustand"

interface RouteFlythroughState {
  /** Incremented on every play request. A new value both interrupts any
   *  in-progress animation (via the watching effect's cleanup) and starts a
   *  fresh one from stop 1 — the same action serves "play" and "restart". */
  runId: number
  play: () => void
}

export const useRouteFlythroughStore = create<RouteFlythroughState>((set) => ({
  runId: 0,
  play: () => set((s) => ({ runId: s.runId + 1 })),
}))
