import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import { router } from "@/app/router"
import { TripDataProvider } from "@/data/TripDataProvider"
import { useTripDataContext } from "@/data/useTripData"
import "leaflet/dist/leaflet.css"
import "@/index.css"

function Root() {
  const { status } = useTripDataContext()

  // The home/map screen works from the committed route-public.json alone —
  // only /hotels, /attractions, /recommendations require the private file,
  // and they gate themselves via PrivateDataGate.
  if (status === "loading") return null
  return <RouterProvider router={router} />
}

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
  <StrictMode>
    <TripDataProvider>
      <Root />
    </TripDataProvider>
  </StrictMode>
)
