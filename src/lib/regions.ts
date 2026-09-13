// The 18 browsable regions for the recommendations screen. Two pairs of
// adjacent one-night hotel stays are grouped into a single region here
// (confirmed with Amit) since they're genuinely the same touristic area —
// entries still cite their own true nearest hotel order individually, this
// grouping only controls how the recommendations screen browses them.
export interface RegionGroup {
  id: string
  label: string
  hotelOrders: number[]
}

export const REGION_GROUPS: RegionGroup[] = [
  { id: "yotsuya", label: "טוקיו (יוצויה)", hotelOrders: [1] },
  { id: "nikko", label: "ניקו", hotelOrders: [2] },
  { id: "ginzan", label: "גינזן אונסן", hotelOrders: [3] },
  { id: "yokohama", label: "יוקוהאמה", hotelOrders: [4] },
  { id: "kawaguchiko", label: "קוואגוצ'יקו", hotelOrders: [5] },
  { id: "hakone", label: "האקונה", hotelOrders: [6] },
  { id: "kanazawa", label: "קנזאווה", hotelOrders: [7] },
  { id: "shirakawago", label: "שירקאווגו", hotelOrders: [8] },
  { id: "takayama", label: "טקאיאמה / אוקוהידה", hotelOrders: [9, 10] },
  { id: "matsumoto", label: "מטסומוטו", hotelOrders: [11] },
  { id: "kiso", label: "עמק קיסו / נקטסוגאווה", hotelOrders: [12, 13] },
  { id: "nagoya", label: "נגויה", hotelOrders: [14] },
  { id: "kyoto", label: "קיוטו", hotelOrders: [15] },
  { id: "osaka", label: "אוסקה", hotelOrders: [16] },
  { id: "hiroshima", label: "הירושימה", hotelOrders: [17] },
  { id: "kumamoto", label: "קומאמוטו", hotelOrders: [18] },
  { id: "asakusa", label: "טוקיו (אסאקוסה)", hotelOrders: [19] },
  { id: "kabukicho", label: "טוקיו (שינג'וקו - קבוקיצ'ו)", hotelOrders: [20] },
]

export function regionGroupForHotelOrder(order: number): RegionGroup | undefined {
  return REGION_GROUPS.find((g) => g.hotelOrders.includes(order))
}

export function regionGroupById(id: string): RegionGroup | undefined {
  return REGION_GROUPS.find((g) => g.id === id)
}
