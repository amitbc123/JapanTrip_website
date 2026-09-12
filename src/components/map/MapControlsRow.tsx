import { PaletteIcon, PlayIcon, SquareIcon } from "lucide-react"
import { useRouteColorStore } from "@/stores/route-color-store"
import { useRouteFlythroughStore } from "@/stores/route-flythrough-store"

const BUTTON_CLASS =
  "flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent/40"

export function MapControlsRow() {
  const color = useRouteColorStore((s) => s.color)
  const setColor = useRouteColorStore((s) => s.setColor)
  const isPlaying = useRouteFlythroughStore((s) => s.isPlaying)
  const toggle = useRouteFlythroughStore((s) => s.toggle)

  return (
    <div className="flex w-full gap-3">
      {/* A <label> wrapping the visible content and the (visually hidden,
          still focusable/clickable) color input forwards a single click
          straight to the native picker — no popover in between. */}
      <label className={BUTTON_CLASS}>
        <PaletteIcon className="size-4" aria-hidden />
        צבע המסלול
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="sr-only"
          aria-label="בחירת צבע המסלול"
        />
      </label>

      <button type="button" onClick={toggle} className={BUTTON_CLASS}>
        {isPlaying ? (
          <>
            <SquareIcon className="size-4" aria-hidden />
            עצירת הסיור
          </>
        ) : (
          <>
            <PlayIcon className="size-4" aria-hidden />
            תצוגת המסלול
          </>
        )}
      </button>
    </div>
  )
}
