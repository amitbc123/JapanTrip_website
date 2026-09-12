# מלווה הטיול ליפן — Japan Trip Companion

Hebrew RTL travel companion for a 61-day Japan trip (2026-10-07 → 2026-12-06): an
interactive route map, full hotel booking details, and booked attractions — all bundled
statically, installable as a PWA, no backend.

## Stack

Vite 8 · React 19 · TypeScript (strict) · React Router 8 · Zustand · shadcn/ui on
Tailwind v4 · react-leaflet + OpenStreetMap tiles · vite-plugin-pwa.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build       # type-check + production build
npm run preview     # serve the production build
npm run lint         # oxlint
```

## Data

`trip-data.json` at the repo root is the authoritative source (hotels, attractions, car
rentals, the domestic flight). It is committed as-is and never edited by the app.

`src/data/trip-data.ts` is a **generated** file — do not hand-edit it. It's produced by:

```bash
node scripts/geocode.mjs
```

This resolves every entry with `geocode: true` via OpenStreetMap Nominatim (rate-limited
to 1 request/second, with a descriptive User-Agent per Nominatim's usage policy), validates
each result against a Japan bounding box, and writes the fully-typed, coordinate-resolved
module. Re-run it only when `trip-data.json` changes.

## Icons

`public/*.png` and `favicon.svg` are generated from `src/assets/app-icon.svg` via:

```bash
node scripts/generate-icons.mjs
```
