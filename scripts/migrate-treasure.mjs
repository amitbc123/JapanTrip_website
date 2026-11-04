#!/usr/bin/env node
/* One-off, repeatable migration: reads the original single-file Treasure Map
 * (scripts/treasure-source/index.html), evaluates only its static data blocks
 * in a sandbox (no DOM), and writes typed JSON for the React site under
 * src/treasure/data/. Fails if any record is malformed or skipped.
 *
 * Usage: node scripts/migrate-treasure.mjs
 */
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "scripts/treasure-source/index.html")
const OUT = path.join(ROOT, "src/treasure/data")

const html = fs.readFileSync(SRC, "utf8")
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
if (scripts.length < 2) throw new Error("expected the data script and the app script")
const app = scripts[1]
function block(start, end) {
  const i = app.indexOf(start)
  const j = app.indexOf(end, i)
  if (i < 0 || j < 0) throw new Error(`block not found: ${start}`)
  return app.slice(i, j)
}
const defs = [
  block("const TZ", "const grpCats"),
  block("const ICON", "const ic ="),
  block("const SPECIAL", "PL.forEach"),
  block("const PHRASES", "\nfunction renderCards"),
].join("\n")
const ctx = {}
vm.createContext(ctx)
vm.runInContext(
  `${scripts[0]}\n${defs}\nthis.out = { D, STN, REGIONS, AREAS, CATS, CAT_ORDER, GROUPS, SUBLBL, ICON, SPECIAL: [...SPECIAL], PHRASES }`,
  ctx
)
const { D, STN, REGIONS, AREAS, CATS, CAT_ORDER, GROUPS, SUBLBL, ICON, SPECIAL, PHRASES } = ctx.out

const errors = []
const report = []
const regionOfArea = Object.fromEntries(REGIONS.flatMap((r) => r.areas.map((a) => [a, r.k])))
const slug = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const usedIds = new Map()
const places = []
D.forEach((r, i) => {
  const [area, cats, en, he, lat, lon, desc, tip, price, flags, hs, gr, grc] = r
  const problems = []
  if (!AREAS[area]) problems.push(`unknown area ${area}`)
  if (!regionOfArea[area]) problems.push(`area ${area} not in any region`)
  if (typeof en !== "string" || !en.trim()) problems.push("missing English name")
  if (typeof he !== "string" || !he.trim()) problems.push("missing Hebrew name")
  if (typeof lat !== "number" || typeof lon !== "number" || lat < 24 || lat > 46 || lon < 122 || lon > 146)
    problems.push("coordinates outside Japan")
  const catList = String(cats ?? "").split(" ").filter(Boolean)
  if (!catList.length || catList.some((c) => !CATS[c])) problems.push(`bad categories "${cats}"`)
  if (!(price === null || [0, 1, 2, 3].includes(price))) problems.push(`bad price ${price}`)
  if (problems.length) {
    errors.push(`record ${i} (${en}): ${problems.join(", ")}`)
    return
  }
  const f = String(flags ?? "")
  const base = `${slug(en)}-${area}`
  const n = (usedIds.get(base) ?? 0) + 1
  usedIds.set(base, n)
  const id = n === 1 ? base : `${base}-${n}`
  if (n > 1) report.push(`duplicate English name in the same area: "${en}" (${area}) -> id ${id}`)
  places.push({
    id,
    area,
    region: regionOfArea[area],
    cats: catList,
    en,
    he,
    lat,
    lon,
    desc: desc ?? "",
    tip: tip ?? "",
    price,
    mustSee: f.includes("M"),
    special: SPECIAL.includes(en),
    seafood: f.includes("X") ? "mostly" : f.includes("A") ? "none" : null,
    dairy: f.includes("2") ? "contains" : f.includes("1") ? "ask" : f.includes("0") ? "free" : null,
    ...(r.length > 10 ? { hardOff: { score: hs ?? null, googleRating: gr ?? null, reviewCount: grc ?? null } } : {}),
  })
})

const missingSpecial = SPECIAL.filter((n) => !places.some((p) => p.en === n))
if (missingSpecial.length) errors.push(`SPECIAL names with no place: ${missingSpecial.join(", ")}`)

const stations = STN.map(([name, lat, lon, lines], i) => {
  if (typeof lat !== "number" || typeof lon !== "number" || !name) errors.push(`station ${i} malformed`)
  return { name, lat, lon, lines: String(lines).split("|").filter(Boolean) }
})

const regions = REGIONS.map((r) => ({
  key: r.k,
  he: r.he,
  kanji: r.kanji,
  from: r.from,
  to: r.to,
  areas: r.areas,
  bases: r.bases.map((b) => ({ key: b.k, name: b.he, lat: b.lat, lon: b.lon, from: b.from, to: b.to })),
}))
const areas = Object.fromEntries(Object.entries(AREAS).map(([k, a]) => [k, { he: a.he, ...(a.trip ? { trip: a.trip } : {}) }]))
const categories = CAT_ORDER.map((k) => ({ key: k, he: CATS[k].he, sub: SUBLBL[k] ?? CATS[k].he, color: CATS[k].c, dark: CATS[k].c2, icon: CATS[k].i }))
const groups = GROUPS.map((g) => ({ key: g.k, he: g.he, color: g.c, icon: g.i, cats: g.cats }))
const phrases = PHRASES.map(([jp, romaji, he]) => ({ jp, romaji, he }))

if (errors.length) {
  console.error(`Migration failed, ${errors.length} problem(s):\n- ${errors.join("\n- ")}`)
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1) + "\n")
write("places.json", places)
write("stations.json", stations)
write("regions.json", regions)
write("areas.json", areas)
write("categories.json", categories)
write("groups.json", groups)
write("icons.json", ICON)
write("phrases.json", phrases)

const count = (fn) => places.filter(fn).length
console.log(`places: ${places.length} (source records: ${D.length}, skipped: 0)`)
console.log(`per region: ${regions.map((r) => `${r.key}=${count((p) => p.region === r.key)}`).join(" ")}`)
console.log(`per category: ${categories.map((c) => `${c.key}=${c.key === "special" ? count((p) => p.special) : count((p) => p.cats.includes(c.key))}`).join(" ")}`)
console.log(`Hard Off category: ${count((p) => p.cats.includes("hardoff"))}, with Hard Off score: ${count((p) => p.hardOff)}`)
console.log(`manhole covers: ${count((p) => p.cats.includes("manhole"))}, only-here: ${count((p) => p.special)}`)
console.log(`stations: ${stations.length}, regions: ${regions.length}, areas: ${Object.keys(areas).length}, phrases: ${phrases.length}`)
for (const line of report) console.log(line)
