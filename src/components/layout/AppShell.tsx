import { Suspense } from "react"
import { Outlet } from "react-router"
import { NavDrawer } from "@/components/layout/NavDrawer"
import { PwaUpdatePrompt } from "@/components/layout/PwaUpdatePrompt"
import { TopBar } from "@/components/layout/TopBar"
import { useEdgeSwipe } from "@/components/layout/useEdgeSwipe"
import { useDrawerStore } from "@/stores/drawer-store"

export function AppShell() {
  const openDrawer = useDrawerStore((s) => s.open)
  useEdgeSwipe(openDrawer)

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <NavDrawer />
      <PwaUpdatePrompt />
    </div>
  )
}
