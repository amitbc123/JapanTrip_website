import { PlaceCard } from "@/treasure/components/PlaceCard"
import { PLACES, REGIONS } from "@/treasure/data"
import { km } from "@/treasure/lib/core"
import { useTreasure } from "@/treasure/store"
import type { Origin } from "@/treasure/types"

export function SavedTab({ planDate }: { planDate: string }) {
  const fav = useTreasure((s) => s.fav)
  const vis = useTreasure((s) => s.vis)
  const favs = PLACES.filter((p) => fav[p.id])
  const visitedCount = PLACES.filter((p) => vis[p.id]).length
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">השמורים שלנו</h2>
        <span className="text-xs text-muted">
          {favs.length} שמורים · {visitedCount} ביקרנו
        </span>
      </div>
      {!favs.length && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          עוד לא שמרתם מקומות.
          <br />
          לחצו על הלב בכרטיס כדי לשמור.
        </p>
      )}
      {REGIONS.map((r) => {
        const base = r.bases[0]!
        const origin: Origin = { lat: base.lat, lon: base.lon, label: base.name, me: false, manual: false }
        const list = favs
          .filter((p) => p.region === r.key)
          .map((p) => ({ p, d: km(base, p) }))
          .sort((a, b) => a.d - b.d)
        if (!list.length) return null
        return (
          <section key={r.key} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold">{r.he}</h3>
              <span className="text-xs text-muted">{list.length} · מרחקים מהמלון</span>
            </div>
            {list.map(({ p, d }) => (
              <PlaceCard key={p.id} p={p} d={d} origin={origin} planDate={planDate} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
