import { useEffect } from "react"
import { useRegisterSW } from "virtual:pwa-register/react"

/** New version of the Treasure Map (its own service worker). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()
  // "Ready offline" is just news: it goes away by itself.
  useEffect(() => {
    if (!offlineReady) return
    const id = window.setTimeout(() => setOfflineReady(false), 4000)
    return () => window.clearTimeout(id)
  }, [offlineReady, setOfflineReady])
  if (!needRefresh && !offlineReady) return null
  return (
    <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[1150] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-lg">
      <p className="text-sm">{needRefresh ? "יש גרסה חדשה של מפת האוצר." : "מפת האוצר מוכנה לשימוש גם בלי אינטרנט."}</p>
      <div className="flex shrink-0 gap-2">
        {needRefresh && (
          <button type="button" onClick={() => updateServiceWorker(true)} className="h-10 rounded-full bg-gold px-4 text-sm font-bold text-gold-ink">
            לעדכן
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setNeedRefresh(false)
            setOfflineReady(false)
          }}
          className="h-10 rounded-full px-3 text-sm text-muted"
        >
          סגירה
        </button>
      </div>
    </div>
  )
}
