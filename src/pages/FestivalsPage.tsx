import { FestivalCard } from "@/components/festivals/FestivalCard"
import localFestivals from "@/data/local-festivals.json"
import { useTripDataContext } from "@/data/useTripData"
import { distanceKm, stayOn, todayInJapan } from "@/lib/upcoming"
import type { Hotel, LocalFestival } from "@/types/trip"

const festivals = localFestivals as LocalFestival[]

/** Distance from the hotel we sleep at on the festival's first day that is
 *  still ahead of us - only known once the private trip file is loaded. */
function distanceFromStay(festival: LocalFestival, today: string, hotels: Hotel[] | undefined): number | undefined {
  if (!hotels) return undefined
  const date = festival.startDate < today ? today : festival.startDate
  const stay = stayOn(date, hotels)
  const hotel = stay ? hotels.find((h) => h.order === stay.order) : undefined
  if (!hotel || hotel.lat === null || hotel.lon === null) return undefined
  return distanceKm({ lat: hotel.lat, lon: hotel.lon }, festival)
}

export function FestivalsPage() {
  const { data: privateData } = useTripDataContext()
  const today = todayInJapan()
  const upcoming = festivals.filter((f) => f.endDate >= today)
  const past = festivals.filter((f) => f.endDate < today)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-3 pb-8">
      <p className="text-[13px] text-muted-foreground">
        פסטיבלים מקומיים ואותנטיים בהונשו, בלי האירועים ההמוניים. התאריכים אומתו מול מקורות ל-2026, אבל כדאי לבדוק שוב
        במקור לפני נסיעה מיוחדת.
      </p>
      {upcoming.length === 0 && <p className="text-[14px] text-muted-foreground">אין פסטיבלים קרובים ברשימה.</p>}
      {upcoming.map((festival) => (
        <FestivalCard
          key={festival.id}
          festival={festival}
          distanceKm={distanceFromStay(festival, today, privateData?.hotels)}
        />
      ))}
      {past.length > 0 && (
        <details className="rounded-lg border border-border bg-card p-3">
          <summary className="cursor-pointer text-[14px] font-medium">כבר עברו · {past.length}</summary>
          <div className="mt-3 flex flex-col gap-3 opacity-70">
            {past.map((festival) => (
              <FestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
