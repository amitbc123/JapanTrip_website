import { useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RecommendationListItem } from "@/components/recommendations/RecommendationListItem"
import { haversineDistanceKm } from "@/lib/geo"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/recommendationCategories"
import type { RegionGroup } from "@/lib/regions"
import { cn } from "@/lib/utils"
import type { Hotel, Recommendation, RecommendationCategory } from "@/types/trip"

export function RegionSection({
  group,
  entries,
  hotels,
}: {
  group: RegionGroup
  entries: Recommendation[]
  hotels: Hotel[]
}) {
  const [category, setCategory] = useState<RecommendationCategory | "all">("all")

  const categoriesPresent = useMemo(
    () => CATEGORY_ORDER.filter((c) => entries.some((e) => e.category === c)),
    [entries]
  )

  if (entries.length === 0) return null

  const visible = category === "all" ? entries : entries.filter((e) => e.category === category)
  const sorted = [...visible].sort((a, b) => a.name.localeCompare(b.name, "he"))

  return (
    <AccordionItem id={`region-${group.id}`} value={group.id} className="scroll-mt-20 border-b border-border px-4">
      <AccordionTrigger>
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-[15px] font-semibold">{group.label}</span>
          <span className="text-[13px] text-muted-foreground">{entries.length} מומלצים</span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-wrap gap-2 pb-3">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-[13px] transition-colors",
              category === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            הכל
          </button>
          {categoriesPresent.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-[13px] transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <Accordion type="multiple">
          {sorted.map((entry) => {
            const hotel = hotels.find((h) => h.order === entry.region)
            const distanceKm =
              hotel && hotel.lat !== null && hotel.lon !== null
                ? haversineDistanceKm({ lat: hotel.lat, lon: hotel.lon }, entry)
                : null
            return (
              <RecommendationListItem key={entry.id} recommendation={entry} distanceKm={distanceKm} />
            )
          })}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  )
}
