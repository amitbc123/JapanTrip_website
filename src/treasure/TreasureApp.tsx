import { CalendarDays, Compass, Heart, Languages } from "lucide-react"
import { useEffect } from "react"
import { CardsTab } from "@/treasure/components/CardsTab"
import { ExploreTab } from "@/treasure/components/ExploreTab"
import { Header } from "@/treasure/components/Header"
import { LocationSheet } from "@/treasure/components/LocationSheet"
import { PlanTab } from "@/treasure/components/PlanTab"
import { SavedTab } from "@/treasure/components/SavedTab"
import { Toast } from "@/treasure/components/Toast"
import { UpdatePrompt } from "@/treasure/components/UpdatePrompt"
import { GROUPS, PLACE_BY_ID, REGIONS } from "@/treasure/data"
import { tripDates } from "@/treasure/lib/core"
import { useTripContext } from "@/treasure/lib/hooks"
import { autoStartLocation } from "@/treasure/lib/location"
import { useTreasure, useUi, type Tab } from "@/treasure/store"
import type { RegionKey } from "@/treasure/types"

const TABS: { key: Tab; label: string; Icon: typeof Compass }[] = [
  { key: "explore", label: "גילוי", Icon: Compass },
  { key: "plan", label: "התוכנית", Icon: CalendarDays },
  { key: "saved", label: "שמורים", Icon: Heart },
  { key: "cards", label: "כרטיסים", Icon: Languages },
]

/** ?region=kyo&topic=anime&place=<id> */
function applyDeepLink() {
  const params = new URLSearchParams(location.search)
  const region = params.get("region")
  const topic = params.get("topic")
  const placeId = params.get("place")
  const patch: Parameters<ReturnType<typeof useUi.getState>["setUi"]>[0] = {}
  if (region && REGIONS.some((r) => r.key === region)) patch.region = region as RegionKey
  if (topic && GROUPS.some((g) => g.key === topic)) patch.group = topic
  const place = placeId ? PLACE_BY_ID.get(placeId) : undefined
  if (place) {
    patch.region = place.region
    patch.openId = place.id
    patch.group = ""
    useTreasure.getState().set({ view: "list", area: { ...useTreasure.getState().area, [place.region]: "" } })
    window.setTimeout(() => document.getElementById(`place-${place.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300)
  }
  useUi.getState().setUi(patch)
}

export function TreasureApp() {
  const ctx = useTripContext()
  const tab = useUi((s) => s.tab)
  const setUi = useUi((s) => s.setUi)
  const chosenDate = useUi((s) => s.planDate)
  const plans = useTreasure((s) => s.plans)
  const favCount = useTreasure((s) => Object.keys(s.fav).length)
  const dates = tripDates(ctx.now.date)
  const planDate = chosenDate && dates.includes(chosenDate) ? chosenDate : dates[0]!
  const planCount = (plans[planDate] ?? []).filter((id) => PLACE_BY_ID.has(id)).length

  useEffect(() => {
    applyDeepLink()
    void autoStartLocation()
  }, [])

  const counts: Partial<Record<Tab, number>> = { plan: planCount, saved: favCount }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <UpdatePrompt />
      <Header ctx={ctx} />
      <main className="flex-1 px-4 pt-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
        {tab === "explore" && <ExploreTab ctx={ctx} planDate={planDate} />}
        {tab === "plan" && <PlanTab today={ctx.now.date} date={planDate} />}
        {tab === "saved" && <SavedTab planDate={planDate} />}
        {tab === "cards" && <CardsTab />}
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-sea/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="ניווט"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {TABS.map(({ key, label, Icon }) => {
            const on = tab === key
            const n = counts[key]
            return (
              <button
                key={key}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => {
                  setUi({ tab: key, openId: null })
                  window.scrollTo({ top: 0 })
                }}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${on ? "text-gold" : "text-muted"}`}
              >
                <Icon className="size-6" aria-hidden />
                {label}
                {n ? (
                  <span className="absolute top-2 start-[calc(50%+6px)] grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-gold-ink">
                    {n}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>
      <LocationSheet ctx={ctx} />
      <Toast />
    </div>
  )
}
