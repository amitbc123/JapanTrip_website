import { lazy, Suspense } from "react"
import { useSearchParams } from "react-router"
import { MapControlsRow } from "@/components/map/MapControlsRow"
import { MapLegend } from "@/components/map/MapLegend"
import { TransportSummary } from "@/components/map/TransportSummary"
import recommendations from "@/data/recommendations.json"
import routePublicRaw from "@/data/route-public.json"
import { useTripDataContext } from "@/data/useTripData"
import { carSummaryFromPrivate, carSummaryFromPublic, flightSummary } from "@/lib/routeSummary"
import type { Hotel, Recommendation, RoutePublicData } from "@/types/trip"

const routePublic = routePublicRaw as RoutePublicData

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
  const { data: privateData } = useTripDataContext()
  const [searchParams] = useSearchParams()
  const hotelParam = searchParams.get("hotel")
  const targetHotelOrder = hotelParam ? Number(hotelParam) : undefined
  const attractionParam = searchParams.get("attraction")
  const targetAttractionName = attractionParam ?? undefined
  const recParam = searchParams.get("rec")
  const targetRecommendation = recParam
    ? (recommendations as Recommendation[]).find((r) => r.id === recParam)
    : undefined

  // The route (stops, polyline, flythrough, car/flight summary) always comes
  // from the committed route-public.json — private trip-data.json, once
  // loaded, only upgrades hotel markers to their full name/dates and the
  // car/flight rows to their fuller private-only strings.
  const stops = privateData ? privateData.hotels : routePublic.hotels
  const hotelDetailsByOrder = new Map<number, Hotel>(
    privateData ? privateData.hotels.map((h) => [h.order, h]) : []
  )
  const carSummaries = privateData
    ? privateData.cars.map(carSummaryFromPrivate)
    : routePublic.cars.map(carSummaryFromPublic)
  const flightSummaries = privateData
    ? privateData.flights.map(flightSummary)
    : routePublic.flights.map(flightSummary)
  const attractions = privateData?.attractions ?? []

  return (
    <div className="flex flex-col gap-4 p-3">
      <div id="home-map">
        <Suspense fallback={<MapLoading />}>
          <TripMap
            hotels={stops}
            hotelDetailsByOrder={hotelDetailsByOrder}
            attractions={attractions}
            carSummaries={carSummaries}
            flightSummaries={flightSummaries}
            targetHotelOrder={targetHotelOrder}
            targetAttractionName={targetAttractionName}
            targetRecommendation={targetRecommendation}
          />
        </Suspense>
      </div>
      <MapLegend />
      <MapControlsRow />
      <TransportSummary cars={carSummaries} flights={flightSummaries} />
    </div>
  )
}
