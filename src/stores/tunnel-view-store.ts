import { create } from "zustand"

interface TunnelViewState {
  /** The map's "tunnel view" (made for Omri): only our train routes, with
   *  every tunnel highlighted. Not persisted — a reload is the normal map. */
  active: boolean
  /** Ride key (see lib/tunnelRides) the map is zoomed to, if any. */
  selectedRide: string | null
  /** A tunnel to fly to and open; `nonce` re-triggers the same one. */
  focus: { rideKey: string; index: number; nonce: number } | null
  toggle: () => void
  selectRide: (key: string | null) => void
  focusTunnel: (rideKey: string, index: number) => void
}

export const useTunnelViewStore = create<TunnelViewState>((set, get) => ({
  active: false,
  selectedRide: null,
  focus: null,
  toggle: () => set({ active: !get().active, selectedRide: null, focus: null }),
  selectRide: (key) => set({ selectedRide: key, focus: null }),
  focusTunnel: (rideKey, index) =>
    set({ selectedRide: rideKey, focus: { rideKey, index, nonce: (get().focus?.nonce ?? 0) + 1 } }),
}))
