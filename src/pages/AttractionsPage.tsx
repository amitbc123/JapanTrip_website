import { Accordion } from "@/components/ui/accordion"
import { AttractionListItem } from "@/components/attractions/AttractionListItem"
import { useTripData } from "@/data/useTripData"

export function AttractionsPage() {
  const tripData = useTripData()
  const attractionsByDate = [...tripData.attractions].sort((a, b) =>
    a.date.localeCompare(b.date)
  )

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
