import { lazy, Suspense } from "react"
import { useSearchParams } from "react-router"
import { MapControlsRow } from "@/components/map/MapControlsRow"
import { MapLegend } from "@/components/map/MapLegend"
import { TransportSummary } from "@/components/map/TransportSummary"
import { useTripData } from "@/data/useTripData"

const TripMap = lazy(() =>
  import("@/components/map/TripMap").then((m) => ({ default: m.TripMap }))
)

function MapLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
      טוען מפה…
    </div>
  )
}

export function HomeMapPage() {
  const tripData = useTripData()
  const [searchParams] = useSearchParams()
  const hotelParam = searchParams.get("hotel")
  const targetHotelOrder = hotelParam ? Number(hotelParam) : undefined
  const attractionParam = searchParams.get("attraction")
  const targetAttractionName = attractionParam ?? undefined

  return (
    <div className="flex flex-col gap-4 p-3">
      <div id="home-map">
        <Suspense fallback={<MapLoading />}>
          <TripMap
            hotels={tripData.hotels}
            attractions={tripData.attractions}
            cars={tripData.cars}
            flights={tripData.flights}
            targetHotelOrder={targetHotelOrder}
            targetAttractionName={targetAttractionName}
          />
        </Suspense>
      </div>
      <MapLegend />
      <MapControlsRow />
      <TransportSummary cars={tripData.cars} flights={tripData.flights} />
    </div>
  )
}
