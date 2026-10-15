import { lazy, Suspense } from "react"
import { useSearchParams } from "react-router"
import { LocationHelpDialog } from "@/components/map/LocationHelpDialog"
import { MapControlsRow } from "@/components/map/MapControlsRow"
import { MapLegend } from "@/components/map/MapLegend"
import { TransportSummary } from "@/components/map/TransportSummary"
import localFestivals from "@/data/local-festivals.json"
import recommendations from "@/data/recommendations.json"
import routePublicRaw from "@/data/route-public.json"
import travelTips from "@/data/travel-tips.json"
import { useTripDataContext } from "@/data/useTripData"
import { carSummaryFromPrivate, carSummaryFromPublic, flightSummary, trainSummary } from "@/lib/routeSummary"
import { getCurrentHotelOrder } from "@/lib/tripProgress"
import { buildAgenda, type LuggageForwarding } from "@/lib/upcoming"
import { useTunnelViewStore } from "@/stores/tunnel-view-store"
import type { Hotel, LocalFestival, Recommendation, RoutePublicData } from "@/types/trip"

const routePublic = routePublicRaw as RoutePublicData

const TripMap = lazy(() =>
  import("@/components/map/TripMap").then((m) => ({ default: m.TripMap }))
)

const TunnelPanel = lazy(() =>
  import("@/components/tunnels/TunnelPanel").then((m) => ({ default: m.TunnelPanel }))
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
  const tunnelView = useTunnelViewStore((s) => s.active)
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
  // Unlike cars/flights, trains always come from route-public.json — never
  // from the private trip file, loaded or not. Price/paid-by is the one
  // exception: when the private file is loaded, it's merged in by trainNumber.
  const privateTrainInfoByNumber = new Map(
    (privateData?.trains ?? []).map((t) => [t.trainNumber, t])
  )
  const trainSummaries = routePublic.trains.map((train) =>
    trainSummary(train, privateTrainInfoByNumber.get(train.trainNumber))
  )
  const attractions = privateData?.attractions ?? []
  // Only known once the private trip file is loaded — route-public.json
  // deliberately carries no check-in dates.
  const currentHotelOrder = privateData ? getCurrentHotelOrder(privateData.hotels) : null
  const agenda = buildAgenda({
    trains: trainSummaries,
    cars: carSummaries,
    flights: flightSummaries,
    hotels: privateData?.hotels,
    attractions,
    festivals: localFestivals as LocalFestival[],
    luggage: travelTips.luggageForwarding as LuggageForwarding[],
  })

  return (
    <div className="flex flex-col gap-4 p-3">
      <div id="home-map">
        <Suspense fallback={<MapLoading />}>
          <TripMap
            hotels={stops}
            hotelDetailsByOrder={hotelDetailsByOrder}
            attractions={attractions}
            airports={routePublic.airports ?? []}
            carSummaries={carSummaries}
            flightSummaries={flightSummaries}
            trainSummaries={trainSummaries}
            legs={routePublic.legs}
            currentHotelOrder={currentHotelOrder}
            targetHotelOrder={targetHotelOrder}
            targetAttractionName={targetAttractionName}
            targetRecommendation={targetRecommendation}
          />
        </Suspense>
      </div>
      <LocationHelpDialog />
      {tunnelView ? (
        <Suspense fallback={null}>
          <TunnelPanel />
        </Suspense>
      ) : (
        <>
          <MapLegend />
          <MapControlsRow />
          <TransportSummary
            cars={carSummaries}
            flights={flightSummaries}
            trains={trainSummaries}
            travelers={privateData?.travelers}
            agenda={agenda}
            hasPrivateData={Boolean(privateData)}
          />
        </>
      )}
    </div>
  )
}
