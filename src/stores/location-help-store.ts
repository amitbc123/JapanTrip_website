import { create } from "zustand"

export type LocationProblem = "denied" | "unavailable" | "timeout" | "unsupported"

interface LocationHelpState {
  problem: LocationProblem | null
  /** Tries locating again — must run inside the user's tap. */
  retry: (() => void) | null
  show: (problem: LocationProblem, retry: (() => void) | null) => void
  close: () => void
}

/** The "how to turn on location" help sheet, opened by the map's location
 *  button when the browser can't get a position. */
export const useLocationHelpStore = create<LocationHelpState>((set) => ({
  problem: null,
  retry: null,
  show: (problem, retry) => set({ problem, retry }),
  close: () => set({ problem: null, retry: null }),
}))
