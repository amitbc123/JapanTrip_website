import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { PHRASES, PLACES } from "@/treasure/data"

const NO_SEAFOOD = {
  jp: "私は魚介類（魚・エビ・イカ・タコ・貝）が食べられません。肉の料理をお願いします。",
  he: "אני לא אוכל פירות ים: דגים, שרימפס, דיונון, תמנון וצדפות. אשמח למנה עם בשר.",
}

/** Full screen, large black-on-white Japanese, to show a waiter. */
function BigText({ jp, onClose }: { jp: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label="כרטיס במסך מלא" className="fixed inset-0 z-[1400] flex items-center justify-center bg-white p-6" onClick={onClose}>
      <button type="button" aria-label="סגירה" onClick={onClose} className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] grid size-12 place-items-center rounded-full bg-black/5 text-black">
        <X className="size-6" aria-hidden />
      </button>
      <p lang="ja" dir="ltr" className="text-center text-[clamp(28px,8vw,56px)] leading-snug font-bold text-black">
        {jp}
      </p>
    </div>
  )
}

export function CardsTab() {
  const [big, setBig] = useState<string | null>(null)
  const card = "flex w-full flex-col gap-1.5 rounded-2xl border border-line bg-card p-4 text-start"
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">כרטיס "בלי פירות ים"</h2>
        <span className="text-xs text-muted">להראות למלצר</span>
      </div>
      <button type="button" onClick={() => setBig(NO_SEAFOOD.jp)} className={`${card} border-gold/60`}>
        <span lang="ja" className="text-xl leading-relaxed font-bold">
          {NO_SEAFOOD.jp}
        </span>
        <span className="text-sm text-muted">{NO_SEAFOOD.he}</span>
        <span className="text-xs text-gold">לחיצה להגדלה</span>
      </button>

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">משפטים שימושיים</h2>
        <span className="text-xs text-muted">לחיצה להגדלה</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {PHRASES.map((p) => (
          <button key={p.jp} type="button" onClick={() => setBig(p.jp)} className={card}>
            <span lang="ja" className="text-lg font-bold">
              {p.jp}
            </span>
            <span dir="ltr" className="text-end text-xs text-dim">
              {p.romaji}
            </span>
            <span className="text-sm">{p.he}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-dim">{PLACES.length} מקומות במאגר · הנתונים נשמרים בטלפון</p>
      {big && <BigText jp={big} onClose={() => setBig(null)} />}
    </div>
  )
}
