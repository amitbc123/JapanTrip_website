import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import { router } from "@/app/router"
import { ImportScreen } from "@/components/data/ImportScreen"
import { TripDataProvider } from "@/data/TripDataProvider"
import { useTripDataContext } from "@/data/useTripData"
import "leaflet/dist/leaflet.css"
import "@/index.css"

function Root() {
  const { status } = useTripDataContext()

  if (status === "loading") return null
  if (status !== "ready") return <ImportScreen />
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
