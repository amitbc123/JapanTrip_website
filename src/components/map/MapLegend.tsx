import { useRouteColorStore } from "@/stores/route-color-store"
import { WAYPOINT_MODE_ORDER, WAYPOINT_MODE_STYLE } from "@/lib/waypointStyle"

const ROUTE_LINE_ITEMS: { style: "solid" | "dashed" | "dotted"; label: string }[] = [
  { style: "solid", label: "רכבת / תחבורה ציבורית" },
  { style: "dashed", label: "רכב" },
  { style: "dotted", label: "טיסה" },
]

export function MapLegend() {
  const routeColor = useRouteColorStore((s) => s.color)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {ROUTE_LINE_ITEMS.map(({ style, label }) => (
          <div key={style} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-8 border-t-[3px]"
              style={{ borderTopStyle: style, borderTopColor: routeColor }}
              aria-hidden
            />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <span className="trip-attraction-marker" aria-hidden />
          אטרקציה
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block size-4 rounded-full bg-[#16a34a] shadow-[0_0_0_3px_rgb(22_163_74_/_0.35)]" aria-hidden />
          המיקום שלנו עכשיו
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-2">
        <span className="text-xs font-medium text-muted-foreground">תחנות ביניים:</span>
        {WAYPOINT_MODE_ORDER.map((mode) => {
          const style = WAYPOINT_MODE_STYLE[mode]
          return (
            <div key={mode} className="flex items-center gap-1.5 text-sm">
              <span
                className="inline-block size-3 rounded-full border-2"
                style={{ borderColor: style.color, background: "#fff" }}
                aria-hidden
              />
              {style.emoji} {style.labelHe}
            </div>
          )
        })}
      </div>
    </div>
  )
}
