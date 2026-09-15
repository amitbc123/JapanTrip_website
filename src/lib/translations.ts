// Hebrew display names for the fixed set of cities/areas that appear as
// `city` fields in trip-data.json. Falls back to the original string for
// anything not listed, so an unmapped value never disappears.
const CITY_HE: Record<string, string> = {
  "Tokyo (Yotsuya)": "טוקיו (יוצויה)",
  Nikko: "ניקו",
  "Ginzan Onsen": "גינזן אונסן",
  Yokohama: "יוקוהאמה",
  Kawaguchiko: "קוואגוצ'יקו",
  Hakone: "האקונה",
  Kanazawa: "קנזאווה",
  Shirakawago: "שירקאווגו",
  Takayama: "טקאיאמה",
  "Okuhida - Hirayu Onsen": "אוקוהידה - היראיו אונסן",
  Matsumoto: "מטסומוטו",
  "Kiso Valley": "עמק קיסו",
  Nakatsugawa: "נקטסוגאווה",
  Nagoya: "נגויה",
  Kyoto: "קיוטו",
  Osaka: "אוסקה",
  Hiroshima: "הירושימה",
  Kumamoto: "קומאמוטו",
  "Tokyo (Asakusa)": "טוקיו (אסאקוסה)",
  "Tokyo (Shinjuku - Kabukicho)": "טוקיו (שינג'וקו - קבוקיצ'ו)",
  "Nagakute, Aichi (near Nagoya)": "נגקוטה, אאיצ'י (ליד נגויה)",
  "Uji, near Kyoto": "אוג'י, ליד קיוטו",
  "Tokyo (Toyosu)": "טוקיו (טויוסו)",
  "Tokyo (Azabudai Hills)": "טוקיו (אזבודאי הילס)",
  Odawara: "אודוארה",
}

export function translateCity(city: string): string {
  return CITY_HE[city] ?? city
}

interface CarDisplayHe {
  label: string
  pickupLocation: string
  dropoffLocation: string
}

// trip-data.json's car pickup/dropoff.location strings are a mix of short
// place descriptors and full street addresses; only the former get a
// Hebrew display string here (addresses stay as-is, same convention as
// hotel addresses).
const CAR_HE: Record<string, CarDisplayHe> = {
  766248811: {
    label: "רכב 1",
    pickupLocation: "יוקוהאמה, יציאה מערבית",
    dropoffLocation: "אודוארה",
  },
  781628244: {
    label: "רכב 2",
    pickupLocation: "920-0031 הירואוקה 1-9-25, קנזאווה, יפן",
    dropoffLocation: "2 טו 45 נוריטאקה-הונדורי, נגויה, יפן",
  },
}

export function translateCarLabel(bookingNumber: string): string {
  return CAR_HE[bookingNumber]?.label ?? bookingNumber
}

export function translateCarPickupLocation(bookingNumber: string, fallback: string): string {
  return CAR_HE[bookingNumber]?.pickupLocation ?? fallback
}

export function translateCarDropoffLocation(bookingNumber: string, fallback: string): string {
  return CAR_HE[bookingNumber]?.dropoffLocation ?? fallback
}

export function translateFlightRoute(flightNumber: string, fallback: string): string {
  if (flightNumber === "JAL630") return "קומאמוטו לטוקיו (הנדה)"
  return fallback
}

export function translateTrainRoute(trainNumber: string, fallback: string): string {
  if (trainNumber === "Revaty Kegon 19") return "אסאקוסה לטובו ניקו"
  if (trainNumber === "Tsubasa 133") return "אוצונומיה לאוישידה"
  return fallback
}

// route-public.json's car `label` ("Car 1"/"Car 2") is the only identifier
// available before the private file is loaded — unlike CAR_HE above, this is
// safe to key off since it carries no booking information.
const CAR_LABEL_HE: Record<string, string> = {
  "Car 1": "רכב 1",
  "Car 2": "רכב 2",
}

export function translateCarLabelByName(label: string): string {
  return CAR_LABEL_HE[label] ?? label
}
