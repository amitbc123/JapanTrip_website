import { PaletteIcon, PlayIcon } from "lucide-react"
import { Popover } from "radix-ui"
import { useRouteColorStore } from "@/stores/route-color-store"
import { useRouteFlythroughStore } from "@/stores/route-flythrough-store"

const BUTTON_CLASS =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent/40"

export function MapControlsRow() {
  const color = useRouteColorStore((s) => s.color)
  const setColor = useRouteColorStore((s) => s.setColor)
  const play = useRouteFlythroughStore((s) => s.play)

  return (
    <div className="flex w-full gap-3">
      <Popover.Root>
        <Popover.Trigger className={BUTTON_CLASS}>
          <PaletteIcon className="size-4" aria-hidden />
          צבע המסלול
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={8}
            className="z-50 flex flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
          >
            <label className="flex items-center justify-between gap-3 text-sm">
              בחירת צבע
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
                aria-label="בחירת צבע המסלול"
              />
            </label>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <button type="button" onClick={play} className={BUTTON_CLASS}>
        <PlayIcon className="size-4" aria-hidden />
        תצוגת המסלול
      </button>
    </div>
  )
}
