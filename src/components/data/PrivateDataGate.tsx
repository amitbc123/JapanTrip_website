import type { ReactNode } from "react"
import { ImportScreen } from "@/components/data/ImportScreen"
import { useTripDataContext } from "@/data/useTripData"

/** Gates a screen behind the private trip-data.json import — used for the
 *  hotels/attractions/recommendations routes, which stay locked even though
 *  the home map no longer requires the private file. */
export function PrivateDataGate({ children }: { children: ReactNode }) {
  const { status } = useTripDataContext()
  if (status === "loading") return null
  if (status !== "ready") return <ImportScreen />
  return <>{children}</>
}
