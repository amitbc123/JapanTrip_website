import { lazy } from "react"
import { createBrowserRouter } from "react-router"
import { AppShell } from "@/components/layout/AppShell"
import { PrivateDataGate } from "@/components/data/PrivateDataGate"

const HomeMapPage = lazy(() => import("@/pages/HomeMapPage").then((m) => ({ default: m.HomeMapPage })))
const HotelsPage = lazy(() => import("@/pages/HotelsPage").then((m) => ({ default: m.HotelsPage })))
const AttractionsPage = lazy(() =>
  import("@/pages/AttractionsPage").then((m) => ({ default: m.AttractionsPage }))
)
const RecommendationsPage = lazy(() =>
  import("@/pages/RecommendationsPage").then((m) => ({ default: m.RecommendationsPage }))
)

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: "/", element: <HomeMapPage /> },
        {
          path: "/hotels",
          element: (
            <PrivateDataGate>
              <HotelsPage />
            </PrivateDataGate>
          ),
        },
        {
          path: "/attractions",
          element: (
            <PrivateDataGate>
              <AttractionsPage />
            </PrivateDataGate>
          ),
        },
        {
          path: "/recommendations",
          element: (
            <PrivateDataGate>
              <RecommendationsPage />
            </PrivateDataGate>
          ),
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
)
