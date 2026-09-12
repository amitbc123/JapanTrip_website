const LEGEND_ITEMS: { style: "solid" | "dashed" | "dotted"; label: string }[] = [
  { style: "solid", label: "רכבת / תחבורה ציבורית" },
  { style: "dashed", label: "רכב" },
  { style: "dotted", label: "טיסה" },
]

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
      {LEGEND_ITEMS.map(({ style, label }) => (
        <div key={style} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block w-8 border-t-[3px]"
            style={{ borderTopStyle: style, borderTopColor: "#d9622b" }}
            aria-hidden
          />
          {label}
        </div>
      ))}
      <div className="flex items-center gap-2 text-sm">
        <span className="trip-attraction-marker" aria-hidden />
        אטרקציה
      </div>
    </div>
  )
}
