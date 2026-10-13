import { create } from "zustand"

interface TunnelViewState {
  /** The map's "tunnel view" (made for Omri): only our train routes, with
   *  every tunnel highlighted. Not persisted — a reload is the normal map. */
  active: boolean
  /** What the map highlights: a ride key or a journey key (see
   *  lib/tunnelRides), or null for everything. */
  selectedRide: string | null
  /** Whether the map should zoom to the selected ride (picked from the
   *  panel) or stay put (tapped on the map itself). */
  fitSelected: boolean
  /** A tunnel to fly to and open; `nonce` re-triggers the same one. */
  focus: { rideKey: string; index: number; nonce: number } | null
  /** Ride whose tunnel list the panel should show opened (set from the map). */
  expandedRide: string | null
  toggle: () => void
  selectRide: (key: string | null, fit?: boolean) => void
  focusTunnel: (rideKey: string, index: number) => void
  showRideDetails: (key: string) => void
}

export const useTunnelViewStore = create<TunnelViewState>((set, get) => ({
  active: false,
  selectedRide: null,
  fitSelected: true,
  focus: null,
  expandedRide: null,
  toggle: () => set({ active: !get().active, selectedRide: null, focus: null, expandedRide: null }),
  selectRide: (key, fit = true) => set({ selectedRide: key, fitSelected: fit, focus: null }),
  focusTunnel: (rideKey, index) =>
    set({ selectedRide: rideKey, focus: { rideKey, index, nonce: (get().focus?.nonce ?? 0) + 1 } }),
  showRideDetails: (key) => set({ selectedRide: key, fitSelected: false, focus: null, expandedRide: key }),
}))
