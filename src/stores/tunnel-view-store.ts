import { create } from "zustand"

export type TravelMode = "train" | "car"

export interface LivePosition {
  lat: number
  lon: number
  /** m/s from the GPS, null when the device doesn't report it. */
  speed: number | null
}

interface TunnelViewState {
  /** The map's "tunnel view" (made for Omri): only our train routes, with
   *  every tunnel highlighted. Not persisted — a reload is the normal map. */
  active: boolean
  /** What the map highlights: a ride key or a journey key (see
   *  lib/tunnelRides), or null for everything. */
  selectedRide: string | null
  /** Whether the selection came from the panel (zoom to it, keep it) or
   *  from tapping the map (stay put, and undo it when its popup closes). */
  fitSelected: boolean
  /** A tunnel to fly to and open; `nonce` re-triggers the same one. */
  focus: { rideKey: string; index: number; nonce: number } | null
  /** Ride whose tunnel list the panel should show opened (set from the map). */
  expandedRide: string | null
  /** The map is following the live location dot (so the tunnel view
   *  shouldn't zoom out to its overview). Set by the location control. */
  followingMe: boolean
  /** Bumped to ask the tunnel view to show its whole-trip overview. */
  fitAllNonce: number
  /** Latest fix of the live location dot (null while it's off). Set by the
   *  location control; the tunnel view uses it to tell train from car. */
  position: LivePosition | null
  /** Last train/car answer that the live location could give (see
   *  lib/travelMode), with when it was found. */
  detected: { mode: TravelMode; source: "location" | "speed"; at: number } | null
  /** Train or car picked by hand, overriding the automatic detection until
   *  the tunnel view is closed. */
  manualMode: TravelMode | null
  setManualMode: (mode: TravelMode | null) => void
  requestFitAll: () => void
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
  followingMe: false,
  fitAllNonce: 0,
  position: null,
  detected: null,
  manualMode: null,
  setManualMode: (mode) => set({ manualMode: mode, selectedRide: null, focus: null, expandedRide: null }),
  requestFitAll: () => set({ fitAllNonce: get().fitAllNonce + 1 }),
  toggle: () =>
    set({ active: !get().active, selectedRide: null, focus: null, expandedRide: null, fitAllNonce: 0, manualMode: null }),
  selectRide: (key, fit = true) => set({ selectedRide: key, fitSelected: fit, focus: null }),
  focusTunnel: (rideKey, index) =>
    set({
      selectedRide: rideKey,
      fitSelected: true,
      focus: { rideKey, index, nonce: (get().focus?.nonce ?? 0) + 1 },
    }),
  showRideDetails: (key) => set({ selectedRide: key, fitSelected: false, focus: null, expandedRide: key }),
}))
