import { Maximize2Icon } from "lucide-react"
import { lazy, Suspense } from "react"
import { useSearchParams } from "react-router"
import { MapLegend } from "@/components/map/MapLegend"
import { TransportSummary } from "@/components/map/TransportSummary"
import { useTripData } from "@/data/useTripData"
import { useMapFitStore } from "@/stores/map-fit-store"

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
  const requestFit = useMapFitStore((s) => s.requestFit)

  return (
    <div className="flex flex-col gap-4 p-3">
      <button
        type="button"
        onClick={requestFit}
        className="flex h-11 w-fit items-center gap-2 self-end rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent/40"
      >
        <Maximize2Icon className="size-4" aria-hidden />
        התאמת המפה למסלול המלא
      </button>
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
      <TransportSummary cars={tripData.cars} flights={tripData.flights} />
    </div>
  )
}
