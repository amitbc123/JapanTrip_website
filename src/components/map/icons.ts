import L from "leaflet"

export function createHotelIcon(order: number, srLabel: string, isCurrent = false): L.DivIcon {
  const className = isCurrent ? "trip-hotel-marker trip-hotel-marker--current" : "trip-hotel-marker"
  const fullLabel = isCurrent ? `${srLabel} (המיקום הנוכחי שלנו)` : srLabel
  return L.divIcon({
    className,
    html: `<span aria-hidden="true">${order}</span><span class="sr-only">${fullLabel}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

export function createAttractionIcon(srLabel: string): L.DivIcon {
  return L.divIcon({
    className: "trip-attraction-marker",
    html: `<span aria-hidden="true">★</span><span class="sr-only">${srLabel}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

export function createFlythroughIcon(): L.DivIcon {
  return L.divIcon({
    className: "trip-flythrough-marker",
    html: `<span class="sr-only">מיקום נוכחי בסיור</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export function createRecommendationIcon(emoji: string, srLabel: string): L.DivIcon {
  return L.divIcon({
    className: "trip-recommendation-marker",
    html: `<span aria-hidden="true">${emoji}</span><span class="sr-only">${srLabel}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  })
}

export function createSegmentEmojiIcon(emoji: string, isDone = false): L.DivIcon {
  const className = isDone ? "trip-segment-emoji trip-segment-emoji--done" : "trip-segment-emoji"
  return L.divIcon({
    className,
    html: `<span aria-hidden="true">${emoji}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/** Small marker for an intermediate stop within a `Leg` — a sub-numbered
 *  label ("2.1") in a white circle with a ring colored by transport mode.
 *  `label` can combine ids for two waypoints that share the same real-world
 *  station ("2.3 / 3.1"). */
export function createWaypointIcon(label: string, ringColor: string, srLabel: string): L.DivIcon {
  return L.divIcon({
    className: "trip-waypoint-marker",
    html: `<span aria-hidden="true" style="border-color:${ringColor}">${label}</span><span class="sr-only">${srLabel}</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
}
