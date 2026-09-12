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
