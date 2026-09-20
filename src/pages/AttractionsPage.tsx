import { Accordion } from "@/components/ui/accordion"
import { AttractionListItem } from "@/components/attractions/AttractionListItem"
import { useTripData } from "@/data/useTripData"

export function AttractionsPage() {
  const tripData = useTripData()
  // Undated bookings sort after every dated one.
  const attractionsByDate = [...tripData.attractions].sort((a, b) => {
    if (a.date === b.date) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return a.date.localeCompare(b.date)
  })

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <Accordion type="multiple">
        {attractionsByDate.map((attraction) => (
          <AttractionListItem key={attraction.name} attraction={attraction} />
        ))}
      </Accordion>
    </div>
  )
}
