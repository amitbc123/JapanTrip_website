import { useRouteColorStore } from "@/stores/route-color-store"

const LEGEND_ITEMS: { style: "solid" | "dashed" | "dotted"; label: string }[] = [
  { style: "solid", label: "רכבת / תחבורה ציבורית" },
  { style: "dashed", label: "רכב" },
  { style: "dotted", label: "טיסה" },
]

export function MapLegend() {
  const color = useRouteColorStore((s) => s.color)

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
      {LEGEND_ITEMS.map(({ style, label }) => (
        <div key={style} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block w-8 border-t-[3px]"
            style={{ borderTopStyle: style, borderTopColor: color }}
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
  )
}
