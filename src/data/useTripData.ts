import { useContext } from "react"
import { TripDataContext, type TripDataContextValue } from "@/data/TripDataProvider"
import type { TripData } from "@/types/trip"

export function useTripDataContext(): TripDataContextValue {
  const ctx = useContext(TripDataContext)
  if (!ctx) throw new Error("useTripDataContext must be used within a TripDataProvider")
  return ctx
}

/** For screens rendered only once data is loaded — guaranteed non-null. */
export function useTripData(): TripData {
  const { data } = useTripDataContext()
  if (!data) throw new Error("useTripData called before trip data was loaded")
  return data
}
