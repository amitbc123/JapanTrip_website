import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { Accordion } from "@/components/ui/accordion"
import { RegionSection } from "@/components/recommendations/RegionSection"
import recommendationsData from "@/data/recommendations.json"
import { useTripData } from "@/data/useTripData"
import { REGION_GROUPS } from "@/lib/regions"
import type { Recommendation } from "@/types/trip"

const recommendations = recommendationsData as Recommendation[]

export function RecommendationsPage() {
  const tripData = useTripData()
  const [searchParams] = useSearchParams()
  const openParam = searchParams.get("open")
  const [openItems, setOpenItems] = useState<string[]>(openParam ? [openParam] : [])

  useEffect(() => {
    if (!openParam) return
    setOpenItems((prev) => (prev.includes(openParam) ? prev : [...prev, openParam]))
    const el = document.getElementById(`region-${openParam}`)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [openParam])

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <Accordion type="multiple" value={openItems} onValueChange={setOpenItems}>
        {REGION_GROUPS.map((group) => (
          <RegionSection
            key={group.id}
            group={group}
            entries={recommendations.filter((r) => group.hotelOrders.includes(r.region))}
            hotels={tripData.hotels}
          />
        ))}
      </Accordion>
    </div>
  )
}
