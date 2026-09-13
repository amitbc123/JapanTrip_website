import { MenuIcon } from "lucide-react"
import { useLocation } from "react-router"
import { useDrawerStore } from "@/stores/drawer-store"

const TITLES: Record<string, string> = {
  "/": "מפת המסלול",
  "/hotels": "מלונות",
  "/attractions": "אטרקציות",
  "/recommendations": "המלצות",
}

export function TopBar() {
  const { pathname } = useLocation()
  const openDrawer = useDrawerStore((s) => s.open)
  const title = TITLES[pathname] ?? "מלווה הטיול ליפן"

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={openDrawer}
        aria-label="פתיחת תפריט"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent"
      >
        <MenuIcon className="size-6" aria-hidden />
      </button>
      <h1 className="truncate text-lg font-semibold">{title}</h1>
    </header>
  )
}
