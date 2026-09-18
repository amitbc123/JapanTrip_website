import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface MapLayers {
  /** Numbered hotel/stop markers — the main route. */
  hotels: boolean
  /** Small sub-numbered transfer/station markers along each leg. */
  waypoints: boolean
  /** Star-shaped booked-attraction markers. */
  attractions: boolean
  /** The little car/train/plane emoji bubble at the midpoint of a coarse
   *  (waypoint-free) hotel-to-hotel segment. */
  transportIcons: boolean
}

interface MapLayersState extends MapLayers {
  setLayer: (layer: keyof MapLayers, value: boolean) => void
}

export const DEFAULT_MAP_LAYERS: MapLayers = {
  hotels: true,
  waypoints: true,
  attractions: true,
  transportIcons: true,
}

export const MAP_LAYER_LABEL_HE: Record<keyof MapLayers, string> = {
  hotels: "מלונות (מספרים)",
  waypoints: "תחנות ביניים",
  attractions: "אטרקציות",
  transportIcons: "סמלי תחבורה",
}

export const useMapLayersStore = create<MapLayersState>()(
  persist(
    (set) => ({
      ...DEFAULT_MAP_LAYERS,
      setLayer: (layer, value) => set({ [layer]: value }),
    }),
    { name: "japan-trip-map-layers" }
  )
)
