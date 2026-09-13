import { LandmarkIcon, ShoppingBagIcon, SparklesIcon, TreePineIcon, UtensilsIcon, type LucideIcon } from "lucide-react"
import type { RecommendationCategory } from "@/types/trip"

export const CATEGORY_ORDER: RecommendationCategory[] = ["sight", "food", "activity", "nature", "shopping"]

export const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  sight: "אתר",
  food: "אוכל",
  activity: "פעילות",
  nature: "טבע",
  shopping: "קניות",
}

export const CATEGORY_ICONS: Record<RecommendationCategory, LucideIcon> = {
  sight: LandmarkIcon,
  food: UtensilsIcon,
  activity: SparklesIcon,
  nature: TreePineIcon,
  shopping: ShoppingBagIcon,
}

// Rendered into raw Leaflet divIcon HTML (see components/map/icons.ts), so
// plain emoji rather than the lucide components used in the list UI above.
export const CATEGORY_EMOJI: Record<RecommendationCategory, string> = {
  sight: "⛩️",
  food: "🍜",
  activity: "🎟️",
  nature: "🌳",
  shopping: "🛍️",
}
