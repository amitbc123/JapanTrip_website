import { LayersIcon } from "lucide-react"
import { Popover } from "radix-ui"
import { MAP_LAYER_LABEL_HE, useMapLayersStore, type MapLayers } from "@/stores/map-layers-store"

const LAYER_ORDER: (keyof MapLayers)[] = ["hotels", "waypoints", "attractions", "transportIcons"]

const BUTTON_CLASS =
  "flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent/40"

/** Lets the map get decluttered on demand — with the route, the hotel
 *  numbers, the leg waypoints, and the attraction pins all sharing the same
 *  view, a long multi-city trip stacks a lot of markers in a small area
 *  (see the Kansai/Chubu cluster). Each layer can be switched off instead. */
export function MapLayersControl() {
  const layers = useMapLayersStore()

  return (
    <Popover.Root>
      <Popover.Trigger className={BUTTON_CLASS}>
        <LayersIcon className="size-4" aria-hidden />
        שכבות מפה
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-50 flex w-56 flex-col gap-1 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
        >
          {LAYER_ORDER.map((layer) => (
            <label key={layer} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm">
              {MAP_LAYER_LABEL_HE[layer]}
              <input
                type="checkbox"
                checked={layers[layer]}
                onChange={(e) => layers.setLayer(layer, e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
