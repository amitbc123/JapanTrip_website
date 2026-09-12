import { lazy } from "react"
import { createBrowserRouter } from "react-router"
import { AppShell } from "@/components/layout/AppShell"

const HomeMapPage = lazy(() => import("@/pages/HomeMapPage").then((m) => ({ default: m.HomeMapPage })))
const HotelsPage = lazy(() => import("@/pages/HotelsPage").then((m) => ({ default: m.HotelsPage })))
const AttractionsPage = lazy(() =>
  import("@/pages/AttractionsPage").then((m) => ({ default: m.AttractionsPage }))
)

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: "/", element: <HomeMapPage /> },
        { path: "/hotels", element: <HotelsPage /> },
        { path: "/attractions", element: <AttractionsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
)
