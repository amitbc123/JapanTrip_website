import { ExternalLinkIcon, MapPinIcon, PartyPopperIcon } from "lucide-react"
import { formatDistanceKm } from "@/lib/upcoming"
import type { FestivalCertainty, LocalFestival } from "@/types/trip"

const CERTAINTY_LABEL: Record<FestivalCertainty, string> = {
  high: "ודאות גבוהה",
  "medium-high": "ודאות בינונית-גבוהה",
  medium: "ודאות בינונית",
}

export function FestivalCard({ festival, distanceKm }: { festival: LocalFestival; distanceKm?: number }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-3 text-start">
      <PartyPopperIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{festival.name}</span>
        <span className="text-[12px] text-muted-foreground" dir="auto">
          {festival.nameOriginal}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {festival.dateLabel} · {festival.region}
        </span>
        <span className="text-[13px] text-muted-foreground">{festival.location}</span>
        {distanceKm !== undefined && (
          <span className="text-[13px] font-medium text-primary">{formatDistanceKm(distanceKm)} מהמלון של אותו לילה</span>
        )}
        <details className="mt-1 text-[13px]">
          <summary className="cursor-pointer text-muted-foreground">פרטים</summary>
          <div className="mt-1 flex flex-col gap-1.5">
            {festival.type && <span className="text-muted-foreground">{festival.type}</span>}
            <p className="leading-relaxed">{festival.description}</p>
            <span className="text-muted-foreground">
              {festival.certainty ? CERTAINTY_LABEL[festival.certainty] : "קרוב לטווח המחקר, לא נבדק לעומק"}
            </span>
          </div>
        </details>
        <div className="mt-1 flex flex-wrap gap-2">
          <a
            href={festival.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <MapPinIcon className="size-3.5" aria-hidden />
            Google Maps
          </a>
          <a
            href={festival.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            <ExternalLinkIcon className="size-3.5" aria-hidden />
            מקור
          </a>
        </div>
      </div>
    </div>
  )
}
