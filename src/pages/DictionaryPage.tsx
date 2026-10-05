import { Maximize2Icon, SearchIcon, StarIcon, Volume2Icon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { DICTIONARY, type DictChapter, type DictPhrase, type DictRule, type DictSection } from "@/data/dictionary"
import { useJapaneseSpeech } from "@/lib/useJapaneseSpeech"
import { useDictionaryFavoritesStore } from "@/stores/dictionary-favorites-store"

const ALL = "all"
const FAVORITES = "favorites"

/** Lowercase, strip diacritics (ō → o) and Hebrew niqqud, so "ohayo" finds
 *  "ohayō" and searching doesn't depend on exact romanization. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-֑ͯ-ׇ]/g, "")
    .toLowerCase()
}

function collapse(text: string): string {
  return text.replace(/[\s\-'’.,?!/()]/g, "")
}

function matches(haystack: string, query: string): boolean {
  if (!query) return true
  const hay = normalize(haystack)
  const q = normalize(query).trim()
  if (q.split(/\s+/).every((token) => hay.includes(token))) return true
  return collapse(hay).includes(collapse(q))
}

function phraseText(p: DictPhrase): string {
  return `${p.he} ${p.romaji} ${p.ja} ${p.note ?? ""}`
}

function ruleText(r: DictRule): string {
  return `${r.title} ${r.detail}`
}

interface VisibleSection {
  chapter: DictChapter
  section: DictSection
  key: string
  phrases: DictPhrase[]
  rules: DictRule[]
  showIntro: boolean
  isFirstInChapter: boolean
}

function SpeakButton({
  phrase,
  speech,
  large = false,
}: {
  phrase: DictPhrase
  speech: ReturnType<typeof useJapaneseSpeech>
  large?: boolean
}) {
  if (!speech.isSupported) return null
  const isSpeaking = speech.speakingId === phrase.id
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speech.speak(phrase.id, phrase.ja)
      }}
      aria-label={`השמעה ביפנית: ${phrase.he}`}
      className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${
        large ? "size-16" : "size-10"
      } ${isSpeaking ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
    >
      <Volume2Icon className={`${large ? "size-8" : "size-5"} ${isSpeaking ? "animate-pulse" : ""}`} aria-hidden />
    </button>
  )
}

function PhraseCard({
  phrase,
  speech,
  isFavorite,
  onToggleFavorite,
  onShowLarge,
}: {
  phrase: DictPhrase
  speech: ReturnType<typeof useJapaneseSpeech>
  isFavorite: boolean
  onToggleFavorite: () => void
  onShowLarge: () => void
}) {
  const toneClass =
    phrase.tone === "avoid"
      ? "border-destructive/40 bg-destructive/5"
      : phrase.tone === "ok"
        ? "border-emerald-600/40 bg-emerald-600/5"
        : "border-border bg-card"

  return (
    <li className={`flex items-start gap-3 rounded-xl border p-3 ${toneClass}`}>
      {phrase.image && (
        <img
          src={`${import.meta.env.BASE_URL}${phrase.image}`}
          alt=""
          loading="lazy"
          className="size-16 shrink-0 object-contain"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold leading-snug">{phrase.he}</span>
        <span lang="ja" className="text-xl leading-snug break-words">
          {phrase.ja}
        </span>
        <span dir="ltr" className="text-start text-[13px] text-muted-foreground italic">
          {phrase.romaji}
        </span>
        {phrase.note && (
          <span
            className={`text-xs font-medium ${
              phrase.tone === "avoid"
                ? "text-destructive"
                : phrase.tone === "ok"
                  ? "text-emerald-700"
                  : "text-muted-foreground"
            }`}
          >
            {phrase.note}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <SpeakButton phrase={phrase} speech={speech} />
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? "הסרה מהשמורים" : "שמירה"}
            aria-pressed={isFavorite}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <StarIcon className={`size-4 ${isFavorite ? "fill-amber-400 text-amber-500" : ""}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onShowLarge}
            aria-label="הצגה בגדול"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <Maximize2Icon className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  )
}

function RuleCard({ rule }: { rule: DictRule }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <span className="text-2xl leading-none" aria-hidden>
        {rule.icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{rule.title}</span>
        <span className="text-[13px] text-muted-foreground">{rule.detail}</span>
      </div>
    </li>
  )
}

/** Full-screen card for showing a phrase to someone (a waiter, a driver) —
 *  the Japanese as large as the screen allows. */
function LargeView({
  phrase,
  speech,
  onClose,
}: {
  phrase: DictPhrase
  speech: ReturnType<typeof useJapaneseSpeech>
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={phrase.he}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex justify-start p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="flex size-11 items-center justify-center rounded-full bg-card shadow"
        >
          <XIcon className="size-6" aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 pb-10 text-center">
        {phrase.image && (
          <img src={`${import.meta.env.BASE_URL}${phrase.image}`} alt="" className="size-40 object-contain" />
        )}
        <p lang="ja" className="text-5xl leading-tight font-semibold break-words sm:text-6xl">
          {phrase.ja}
        </p>
        <p dir="ltr" className="text-xl text-muted-foreground italic">
          {phrase.romaji}
        </p>
        <p className="text-2xl font-semibold">{phrase.he}</p>
        <SpeakButton phrase={phrase} speech={speech} large />
      </div>
    </div>
  )
}

export function DictionaryPage() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<string>(ALL)
  const [largePhrase, setLargePhrase] = useState<DictPhrase | null>(null)
  const favoriteIds = useDictionaryFavoritesStore((s) => s.ids)
  const toggleFavorite = useDictionaryFavoritesStore((s) => s.toggle)
  const speech = useJapaneseSpeech()

  const totalPhrases = useMemo(
    () => DICTIONARY.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.phrases.length, 0), 0),
    []
  )

  const visible = useMemo<VisibleSection[]>(() => {
    const favorites = new Set(favoriteIds)
    const searching = query.trim().length > 0
    const result: VisibleSection[] = []
    for (const chapter of DICTIONARY) {
      if (filter !== ALL && filter !== FAVORITES && filter !== chapter.id) continue
      chapter.sections.forEach((section, si) => {
        const phrases = section.phrases.filter(
          (p) => (filter !== FAVORITES || favorites.has(p.id)) && matches(phraseText(p), query)
        )
        const rules = filter === FAVORITES ? [] : section.rules.filter((r) => matches(ruleText(r), query))
        const showIntro =
          filter !== FAVORITES && !!section.intro && (!searching || section.intro.some((line) => matches(line, query)))
        if (phrases.length || rules.length || showIntro) {
          const isFirstInChapter = result[result.length - 1]?.chapter.id !== chapter.id
          result.push({ chapter, section, key: `${chapter.id}-${si}`, phrases, rules, showIntro, isFirstInChapter })
        }
      })
    }
    return result
  }, [query, filter, favoriteIds])

  const resultCount = visible.reduce((n, v) => n + v.phrases.length + v.rules.length, 0)

  return (
    <div className="mx-auto flex max-w-2xl flex-col pb-10">
      <div className="mx-3 mt-3 rounded-2xl bg-gradient-to-l from-[#b91c1c] to-[#7f1d1d] p-4 text-white shadow">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">המילון של עמרי 🇯🇵</h2>
            <p className="text-sm opacity-90">מילון יפנית: מסע אחרי התואר</p>
          </div>
          <span lang="ja" className="text-4xl opacity-90" aria-hidden>
            辞書
          </span>
        </div>
        <p className="mt-2 text-xs opacity-85">
          {totalPhrases} ביטויים ב-{DICTIONARY.length} פרקים.
          {speech.isSupported ? " לחיצה על 🔊 משמיעה ביפנית." : ""} ⛶ מציג בגדול כדי להראות למישהו.
        </p>
      </div>

      <div className="sticky top-[69px] z-30 flex flex-col gap-2 bg-background/95 px-3 pt-3 pb-2 backdrop-blur-sm">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש בעברית, ביפנית או ב-romaji..."
            aria-label="חיפוש במילון"
            className="h-11 w-full rounded-xl border border-border bg-card ps-9 pe-9 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ניקוי החיפוש"
              className="absolute end-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {[
            { id: ALL, label: "הכל" },
            { id: FAVORITES, label: `⭐ שמורים (${favoriteIds.length})` },
            ...DICTIONARY.map((c) => ({ id: c.id, label: `${c.emoji} ${c.title}` })),
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setFilter(chip.id)
                window.scrollTo({ top: 0 })
              }}
              aria-pressed={filter === chip.id}
              className={`h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap ${
                filter === chip.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {(query || filter !== ALL) && (
          <p className="text-xs text-muted-foreground">{resultCount} תוצאות</p>
        )}
      </div>

      <div className="flex flex-col gap-5 px-3 pt-2">
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {filter === FAVORITES && !query
              ? "עוד לא שמרת ביטויים. לחיצה על ☆ ליד ביטוי שומרת אותו כאן."
              : "לא נמצאו תוצאות. נסו מילה אחרת, או לחפש ב-romaji."}
          </div>
        )}
        {visible.map(({ chapter, section, key, phrases, rules, showIntro, isFirstInChapter }) => {
          return (
            <section key={key} className="flex flex-col gap-2">
              {isFirstInChapter && (
                <h2 className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <span aria-hidden>{chapter.emoji}</span>
                  <span>
                    פרק {chapter.number}: {chapter.title}
                  </span>
                </h2>
              )}
              <h3
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  section.important ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                {section.important && "❗ "}
                {section.title}
              </h3>
              {showIntro && section.intro && (
                <ul className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-[14px]">
                  {section.intro.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {rules.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {rules.map((rule) => (
                    <RuleCard key={rule.title} rule={rule} />
                  ))}
                </ul>
              )}
              {phrases.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {phrases.map((phrase) => (
                    <PhraseCard
                      key={phrase.id}
                      phrase={phrase}
                      speech={speech}
                      isFavorite={favoriteIds.includes(phrase.id)}
                      onToggleFavorite={() => toggleFavorite(phrase.id)}
                      onShowLarge={() => setLargePhrase(phrase)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {largePhrase && <LargeView phrase={largePhrase} speech={speech} onClose={() => setLargePhrase(null)} />}
    </div>
  )
}
