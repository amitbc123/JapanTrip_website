import type { Leg, LegWaypoint } from "@/types/trip"

export interface WaypointGroupEntry {
  leg: Leg
  waypoint: LegWaypoint
}

export interface WaypointGroup {
  /** geocodeQuery of the first entry — stable grouping key. */
  key: string
  lat: number
  lon: number
  /** All the times this real-world station appears across different legs —
   *  e.g. Oishida shows up as both 2.3 (14.10) and 3.1 (16.10). Sorted by
   *  the leg's date. */
  entries: WaypointGroupEntry[]
}

/** Groups every leg's waypoints by real-world station (same `geocodeQuery`),
 *  so a station visited twice on different dates gets a single combined
 *  marker ("2.3 / 3.1") instead of two overlapping ones. Waypoints missing
 *  a resolved coordinate are dropped, same convention as hotels/attractions. */
export function groupWaypoints(legs: Leg[]): WaypointGroup[] {
  const groups = new Map<string, WaypointGroup>()

  for (const leg of legs) {
    for (const waypoint of leg.waypoints) {
      if (waypoint.lat === null || waypoint.lon === null) continue
      const existing = groups.get(waypoint.geocodeQuery)
      if (existing) {
        existing.entries.push({ leg, waypoint })
      } else {
        groups.set(waypoint.geocodeQuery, {
          key: waypoint.geocodeQuery,
          lat: waypoint.lat,
          lon: waypoint.lon,
          entries: [{ leg, waypoint }],
        })
      }
    }
  }

  for (const group of groups.values()) {
    group.entries.sort((a, b) => a.leg.date.localeCompare(b.leg.date))
  }

  return [...groups.values()]
}

export function waypointGroupLabel(group: WaypointGroup): string {
  return group.entries.map((e) => e.waypoint.id).join(" / ")
}
