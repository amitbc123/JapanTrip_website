import { useRegisterSW } from "virtual:pwa-register/react"
import { Button } from "@/components/ui/button"

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null

  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground shadow-lg sm:inset-x-auto sm:end-4 sm:w-96">
      <p className="text-sm">
        {needRefresh
          ? "גרסה חדשה של האפליקציה זמינה."
          : "האפליקציה מוכנה לשימוש גם ללא אינטרנט."}
      </p>
      <div className="flex shrink-0 gap-2">
        {needRefresh && (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            רענון
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={close}>
          סגירה
        </Button>
      </div>
    </div>
  )
}
