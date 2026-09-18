import { WAYPOINT_MODE_ORDER, WAYPOINT_MODE_STYLE } from "@/lib/waypointStyle"

export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
      {WAYPOINT_MODE_ORDER.map((mode) => {
        const style = WAYPOINT_MODE_STYLE[mode]
        return (
          <div key={mode} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-8 border-t-[3px]"
              style={{
                borderTopStyle: style.dashArray ? "dashed" : "solid",
                borderTopColor: style.color,
                borderTopWidth: `${style.weight}px`,
              }}
              aria-hidden
            />
            {style.emoji} {style.labelHe}
          </div>
        )
      })}
      <div className="flex items-center gap-2 text-sm">
        <span className="trip-attraction-marker" aria-hidden />
        אטרקציה
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block size-4 rounded-full bg-[#16a34a] shadow-[0_0_0_3px_rgb(22_163_74_/_0.35)]" aria-hidden />
        המיקום שלנו עכשיו
      </div>
    </div>
  )
}
