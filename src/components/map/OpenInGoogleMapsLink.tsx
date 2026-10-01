import { MapPinnedIcon } from "lucide-react"

/** Google's cross-platform Maps URL: opens the Google Maps app when it's
 *  installed (Android/iOS), the website otherwise, with a pin on the exact
 *  coordinates. */
function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

export function OpenInGoogleMapsLink({ lat, lon }: { lat: number; lon: number }) {
  return (
    <a
      href={googleMapsUrl(lat, lon)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="פתיחה ב-Google Maps"
      className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground! no-underline! hover:bg-accent/40"
    >
      <MapPinnedIcon className="size-3.5" aria-hidden />
      Google Maps
    </a>
  )
}
