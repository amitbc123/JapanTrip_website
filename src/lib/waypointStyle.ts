import type { WaypointMode } from "@/types/trip"

interface WaypointModeStyle {
  color: string
  dashArray: string | undefined
  weight: number
  labelHe: string
  emoji: string
}

/** Per-mode line color/style/weight for intra-leg polylines, and the ring
 *  color used on waypoint markers — per the spec's fixed 6-color legend. */
export const WAYPOINT_MODE_STYLE: Record<WaypointMode, WaypointModeStyle> = {
  shinkansen: { color: "#D64545", dashArray: undefined, weight: 4, labelHe: "שינקנסן", emoji: "🚄" },
  local_train: { color: "#4A7FB5", dashArray: undefined, weight: 2, labelHe: "רכבת מקומית", emoji: "🚃" },
  car: { color: "#E8863C", dashArray: "10 8", weight: 3, labelHe: "רכב", emoji: "🚗" },
  flight: { color: "#8B5CF6", dashArray: "2 8", weight: 3, labelHe: "טיסה", emoji: "✈️" },
  bus: { color: "#2E9E6B", dashArray: "10 8", weight: 2, labelHe: "אוטובוס", emoji: "🚌" },
  metro: { color: "#6B7280", dashArray: "2 8", weight: 2, labelHe: "מטרו / הליכה", emoji: "🚶" },
}

export const WAYPOINT_MODE_ORDER: WaypointMode[] = [
  "shinkansen",
  "local_train",
  "car",
  "flight",
  "bus",
  "metro",
]
