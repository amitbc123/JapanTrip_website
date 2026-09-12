// One-time script: resolves lat/lon for every hotel/attraction with
// geocode:true via OpenStreetMap Nominatim, and writes a plain JSON file in
// the exact shape the app's runtime file-import screen expects. Neither the
// input nor the output file is committed to the repo — the app loads real
// trip data at runtime, never bundled.
//
// Usage: node scripts/geocode.mjs [--input trip-data.json] [--output my-trip-data.json]

import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const SOURCE_PATH = path.resolve(ROOT, argValue("--input", "trip-data.json"))
const OUTPUT_PATH = path.resolve(ROOT, argValue("--output", "my-trip-data.json"))

// Sanity bounding box for Japan (lat 24-46, lon 122-146). A geocode result
// outside this box is treated as failed rather than plotted incorrectly.
const JAPAN_BOUNDS = { minLat: 24, maxLat: 46, minLon: 122, maxLon: 146 }

const USER_AGENT =
  "japan-trip-companion-app/1.0 (personal travel companion, one-time geocoding script)"

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Extra fallback queries for entries where the curated geocodeQuery, the
// address, and the "name, city, Japan" guess all come back empty on
// Nominatim. Keyed by entry name. Each is still a live, real lookup —
// just a differently-worded search (village name only, native-script
// name) rather than a hand-picked coordinate.
const EXTRA_FALLBACKS = {
  "Notoya Ryokan": ["Ginzan Onsen, Obanazawa, Yamagata, Japan"],
  "Ghibli Park": ["ジブリパーク"],
}

function inJapanBounds(lat, lon) {
  return (
    lat >= JAPAN_BOUNDS.minLat &&
    lat <= JAPAN_BOUNDS.maxLat &&
    lon >= JAPAN_BOUNDS.minLon &&
    lon <= JAPAN_BOUNDS.maxLon
  )
}

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", query)
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", "1")

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!res.ok) {
    throw new Error(`Nominatim request failed (${res.status}) for "${query}"`)
  }
  const results = await res.json()
  if (results.length === 0) return null

  const lat = Number.parseFloat(results[0].lat)
  const lon = Number.parseFloat(results[0].lon)
  return { lat, lon }
}

async function tryQuery(query, label) {
  if (!query) return null
  console.log(`Geocoding: ${label} — "${query}"`)
  const result = await geocode(query)

  if (!result) {
    console.warn(`  ⚠ no result for "${query}"`)
    return null
  }
  if (!inJapanBounds(result.lat, result.lon)) {
    console.warn(
      `  ⚠ result (${result.lat}, ${result.lon}) for "${query}" falls outside Japan bounds, treating as failed`
    )
    return null
  }
  console.log(`  ✓ resolved to (${result.lat}, ${result.lon})`)
  return result
}

async function resolveEntry(entry, label) {
  if (!entry.geocode) return entry

  // Try the curated geocodeQuery first, then fall back to progressively
  // simpler queries built from the entry's own address/name/city fields
  // (still a live Nominatim lookup each time, never a hand-invented coordinate).
  const fallbackQueries = [
    entry.geocodeQuery,
    entry.address ?? null,
    `${entry.name}, ${entry.city}, Japan`,
    ...(EXTRA_FALLBACKS[entry.name] ?? []),
  ].filter((q, i, arr) => q && arr.indexOf(q) === i)

  for (const [i, query] of fallbackQueries.entries()) {
    if (i > 0) await sleep(1100)
    const result = await tryQuery(query, label)
    if (result) {
      return { ...entry, lat: result.lat, lon: result.lon }
    }
  }

  console.warn(`  ✗ all queries failed for ${label}, leaving lat/lon null`)
  return { ...entry, lat: null, lon: null }
}

async function main() {
  const raw = await readFile(SOURCE_PATH, "utf-8")
  const tripData = JSON.parse(raw)

  const hotels = []
  for (const hotel of tripData.hotels) {
    hotels.push(await resolveEntry(hotel, `hotel #${hotel.order} ${hotel.name}`))
    if (hotel.geocode) await sleep(1100)
  }

  const attractions = []
  for (const attraction of tripData.attractions) {
    attractions.push(await resolveEntry(attraction, `attraction ${attraction.name}`))
    if (attraction.geocode) await sleep(1100)
  }

  const resolved = { ...tripData, hotels, attractions }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(resolved, null, 2)}\n`, "utf-8")
  console.log(`\nWrote ${path.relative(ROOT, OUTPUT_PATH)}`)
  console.log("Load this file through the app's import screen — it is not committed to git.")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
