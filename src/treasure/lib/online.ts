import { useEffect, useSyncExternalStore } from "react"
import type { LatLon, Place } from "@/treasure/types"
import { km } from "@/treasure/lib/core"

/* ---------------- online / offline ---------------- */

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

/* ---------------- small cache in localStorage ---------------- */

function readCache<T>(key: string, maxAgeMs: number): { data: T; at: number } | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data: T; at: number }
    return Date.now() - parsed.at < maxAgeMs ? parsed : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, at: Date.now() }))
  } catch {
    /* storage full or blocked */
  }
}

/* ---------------- loaded-once values, shared by every component ---------------- */

interface Entry<T> {
  data: T | null
  at: number | null
  loading: boolean
}

/** Values fetched from the network, kept outside React (so components just
 *  read them) and mirrored to localStorage for offline use. */
function createLoader<T>(storagePrefix: string, freshMs: number, keepMs: number) {
  const entries = new Map<string, Entry<T>>()
  const listeners = new Set<() => void>()
  const EMPTY: Entry<T> = { data: null, at: null, loading: false }
  const emit = () => listeners.forEach((l) => l())
  const setEntry = (key: string, e: Entry<T>) => {
    entries.set(key, e)
    emit()
  }
  return {
    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    get(key: string | null): Entry<T> {
      return (key && entries.get(key)) || EMPTY
    },
    /** Uses the stored copy when fresh enough, else fetches (when online). */
    ensure(key: string, online: boolean, fetcher: () => Promise<T>) {
      const current = entries.get(key)
      if (current?.loading || (current?.at && Date.now() - current.at < freshMs)) return
      const fresh = readCache<T>(storagePrefix + key, freshMs)
      if (fresh) return setEntry(key, { data: fresh.data, at: fresh.at, loading: false })
      const old = readCache<T>(storagePrefix + key, keepMs)
      if (!online) {
        if (old && !current) setEntry(key, { data: old.data, at: old.at, loading: false })
        return
      }
      setEntry(key, { data: old?.data ?? current?.data ?? null, at: old?.at ?? current?.at ?? null, loading: true })
      fetcher()
        .then((data) => {
          writeCache(storagePrefix + key, data)
          setEntry(key, { data, at: Date.now(), loading: false })
        })
        .catch(() => setEntry(key, { ...(entries.get(key) ?? EMPTY), loading: false }))
    },
  }
}

/* ---------------- weather (Open-Meteo, no key) ---------------- */

export interface Weather {
  now: { temp: number; code: number; precip: number }
  /** Next hours: "HH:00", °C, % chance of rain. */
  hours: { time: string; temp: number; rain: number; code: number }[]
  /** Per date "YYYY-MM-DD". */
  days: Record<string, { max: number; min: number; rain: number; code: number; sunset: string }>
}

const WEATHER_MS = 30 * 60 * 1000

export function weatherIcon(code: number): string {
  if (code === 0) return "☀️"
  if (code <= 2) return "🌤️"
  if (code === 3) return "☁️"
  if (code === 45 || code === 48) return "🌫️"
  if (code >= 95) return "⛈️"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "🌨️"
  if (code >= 51) return "🌧️"
  return "🌤️"
}

export function weatherText(code: number): string {
  if (code === 0) return "בהיר"
  if (code <= 2) return "מעונן חלקית"
  if (code === 3) return "מעונן"
  if (code === 45 || code === 48) return "ערפל"
  if (code >= 95) return "סופת רעמים"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "שלג"
  if (code >= 80) return "ממטרים"
  if (code >= 61) return "גשם"
  if (code >= 51) return "טפטוף"
  return ""
}

async function fetchWeather(at: LatLon): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${at.lat.toFixed(3)}&longitude=${at.lon.toFixed(3)}` +
    "&current=temperature_2m,weather_code,precipitation" +
    "&hourly=temperature_2m,precipitation_probability,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunset" +
    "&timezone=Asia%2FTokyo&forecast_days=16"
  const res = await fetch(url)
  if (!res.ok) throw new Error(`weather ${res.status}`)
  const j = await res.json()
  const nowIso: string = j.current.time
  const start = (j.hourly.time as string[]).findIndex((t) => t >= nowIso.slice(0, 13))
  const hours = (j.hourly.time as string[]).slice(Math.max(0, start), Math.max(0, start) + 12).map((t, i) => {
    const k = Math.max(0, start) + i
    return { time: t.slice(11, 16), temp: Math.round(j.hourly.temperature_2m[k]), rain: j.hourly.precipitation_probability[k] ?? 0, code: j.hourly.weather_code[k] }
  })
  const days: Weather["days"] = {}
  ;(j.daily.time as string[]).forEach((d, i) => {
    days[d] = {
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rain: j.daily.precipitation_probability_max[i] ?? 0,
      code: j.daily.weather_code[i],
      sunset: String(j.daily.sunset[i]).slice(11, 16),
    }
  })
  return { now: { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, precip: j.current.precipitation }, hours, days }
}

const weatherLoader = createLoader<Weather>("treasure-weather:", WEATHER_MS, 3 * 24 * 60 * 60 * 1000)

/** Weather near a point (rounded to ~10 km, refreshed every 30 min, the last
 *  copy kept for offline). */
export function useWeather(at: LatLon | null): { weather: Weather | null; at: number | null } {
  const online = useOnline()
  const lat = at ? Number(at.lat.toFixed(1)) : null
  const lon = at ? Number(at.lon.toFixed(1)) : null
  const key = lat !== null && lon !== null ? `${lat},${lon}` : null
  const entry = useSyncExternalStore(weatherLoader.subscribe, () => weatherLoader.get(key))
  useEffect(() => {
    if (key && lat !== null && lon !== null) weatherLoader.ensure(key, online, () => fetchWeather({ lat, lon }))
  }, [key, lat, lon, online])
  return { weather: entry.data, at: entry.at }
}

/* ---------------- Wikipedia summary + photo ---------------- */

export interface WikiInfo {
  title: string
  extract: string
  lang: "he" | "en"
  url: string
  image: string | null
}

const WIKI_MS = 30 * 24 * 60 * 60 * 1000

interface WikiPage {
  title: string
  index?: number
  coordinates?: { lat: number; lon: number }[]
  thumbnail?: { source: string }
  extract?: string
  fullurl?: string
  langlinks?: { lang: string; "*"?: string; title?: string }[]
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** Only an article that is really this place: its coordinates within 1.5 km,
 *  or (no coordinates) its title fully contained in the place name. */
function matches(page: WikiPage, p: Place): boolean {
  const c = page.coordinates?.[0]
  if (c) return km(c, p) <= 1.5
  const t = norm(page.title)
  return t.length >= 6 && norm(p.en).includes(t)
}

async function fetchWiki(p: Place, city: string): Promise<WikiInfo | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${p.en} ${city}`,
    gsrlimit: "4",
    prop: "coordinates|pageimages|extracts|info|langlinks",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    piprop: "thumbnail",
    pithumbsize: "640",
    inprop: "url",
    lllang: "he",
    colimit: "max",
  })
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`)
  if (!res.ok) throw new Error(`wiki ${res.status}`)
  const j = await res.json()
  const pages = Object.values((j.query?.pages ?? {}) as Record<string, WikiPage>).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  const page = pages.find((x) => matches(x, p))
  if (!page) return null
  const he = page.langlinks?.find((l) => l.lang === "he")
  const heTitle = he?.["*"] ?? he?.title
  if (heTitle) {
    try {
      const r = await fetch(`https://he.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(heTitle)}`)
      if (r.ok) {
        const s = await r.json()
        if (s.extract)
          return {
            title: s.title,
            extract: s.extract,
            lang: "he",
            url: s.content_urls?.mobile?.page ?? `https://he.wikipedia.org/wiki/${encodeURIComponent(heTitle)}`,
            image: page.thumbnail?.source ?? s.thumbnail?.source ?? null,
          }
      }
    } catch {
      /* fall back to English */
    }
  }
  if (!page.extract) return null
  return { title: page.title, extract: page.extract, lang: "en", url: page.fullurl ?? "", image: page.thumbnail?.source ?? null }
}

const wikiLoader = createLoader<WikiInfo | null>("treasure-wiki:", WIKI_MS, WIKI_MS)

/** Wikipedia summary and photo for a place, when online. Results (and
 *  "no article") are kept for a month. */
export function useWiki(p: Place, city: string, enabled: boolean): { info: WikiInfo | null; loading: boolean } {
  const online = useOnline()
  const entry = useSyncExternalStore(wikiLoader.subscribe, () => wikiLoader.get(enabled ? p.id : null))
  useEffect(() => {
    if (enabled) wikiLoader.ensure(p.id, online, () => fetchWiki(p, city))
  }, [enabled, online, p, city])
  return { info: entry.data, loading: entry.loading }
}

/** Quick Google Maps searches around a point (online). Japanese queries
 *  find much more in Japan. */
export const AROUND_SEARCHES: { label: string; query: string }[] = [
  { label: "רמן", query: "ラーメン" },
  { label: "מסעדות", query: "レストラン" },
  { label: "קפה", query: "カフェ" },
  { label: "קונביני", query: "コンビニ" },
  { label: "ATM", query: "セブン銀行 ATM" },
  { label: "שירותים", query: "公衆トイレ" },
  { label: "לוקרים", query: "コインロッカー" },
  { label: "Hard Off", query: "ハードオフ" },
  { label: "בית מרקחת", query: "ドラッグストア" },
]
