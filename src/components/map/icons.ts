import L from "leaflet"

export function createHotelIcon(order: number, srLabel: string): L.DivIcon {
  return L.divIcon({
    className: "trip-hotel-marker",
    html: `<span aria-hidden="true">${order}</span><span class="sr-only">${srLabel}</span>`,
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

export function createSegmentEmojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: "trip-segment-emoji",
    html: `<span aria-hidden="true">${emoji}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}
