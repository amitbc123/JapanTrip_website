import type L from "leaflet"
import { Marker, Popup } from "react-leaflet"
import { createRecommendationIcon } from "@/components/map/icons"
import { formatCostPerPerson } from "@/lib/format"
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/recommendationCategories"
import type { Recommendation } from "@/types/trip"

interface RecommendationMarkerProps {
  recommendation: Recommendation
  registerRef?: (id: string, marker: L.Marker | null) => void
}

export function RecommendationMarker({ recommendation, registerRef }: RecommendationMarkerProps) {
  const emoji = CATEGORY_EMOJI[recommendation.category]
  const srLabel = `המלצה: ${recommendation.name}`

  return (
    <Marker
      position={[recommendation.lat, recommendation.lon]}
      icon={createRecommendationIcon(emoji, srLabel)}
      ref={(marker) => registerRef?.(recommendation.id, marker)}
    >
      <Popup className="trip-map-popup">
        <div className="flex min-w-40 flex-col gap-1 text-end">
          <span className="font-semibold">{recommendation.name}</span>
          <span className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[recommendation.category]}
          </span>
          <span className="text-xs">{formatCostPerPerson(recommendation.costPerPerson)}</span>
        </div>
      </Popup>
    </Marker>
  )
}
