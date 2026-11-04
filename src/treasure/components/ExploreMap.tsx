import L from "leaflet"
import { Crosshair, Maximize2, WifiOff } from "lucide-react"
import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { glyphHtml, mainCat } from "@/treasure/data"
import type { Scored } from "@/treasure/lib/explore"
import { useLiveLocation } from "@/treasure/lib/location"
import { useOnline } from "@/treasure/lib/online"
import { useTreasure, useUi } from "@/treasure/store"
import type { LatLon, Origin, Place } from "@/treasure/types"

const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
const TILE_ATTRIBUTION = "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
/** Below this zoom, pins closer than CLUSTER_PX on screen merge into a count. */
const CLUSTER_UNTIL_ZOOM = 15
const CLUSTER_PX = 46

function pinIcon(p: Place, picked: boolean, visited: boolean): L.DivIcon {
  const cat = mainCat(p)
  return L.divIcon({
    className: "",
    html: `<div class="tm-pin${p.mustSee ? " is-must" : ""}${picked ? " is-picked" : ""}${visited ? " is-visited" : ""}" style="--c:${cat.color}">${glyphHtml(cat.icon)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const hotelIcon = L.divIcon({
  className: "",
  html: `<div class="tm-hotel">${glyphHtml("bed")}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

/** Pins (clustered when zoomed out) for the current results. */
function PinsLayer({ items }: { items: Scored[] }) {
  const map = useMap()
  const pick = useUi((s) => s.mapPick)
  const visited = useTreasure((s) => s.vis)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    layerRef.current = group
    const draw = () => {
      group.clearLayers()
      const zoom = map.getZoom()
      const clusters: { pts: Place[]; x: number; y: number }[] = []
      for (const { p } of items) {
        const pt = map.latLngToLayerPoint([p.lat, p.lon])
        const hit =
          zoom < CLUSTER_UNTIL_ZOOM && p.id !== pick
            ? clusters.find((c) => Math.abs(c.x - pt.x) < CLUSTER_PX && Math.abs(c.y - pt.y) < CLUSTER_PX && c.pts[0]!.id !== pick)
            : undefined
        if (hit) hit.pts.push(p)
        else clusters.push({ pts: [p], x: pt.x, y: pt.y })
      }
      for (const c of clusters) {
        if (c.pts.length === 1) {
          const p = c.pts[0]!
          const m = L.marker([p.lat, p.lon], {
            icon: pinIcon(p, p.id === pick, !!visited[p.id]),
            keyboard: true,
            title: p.en,
            zIndexOffset: p.id === pick ? 1000 : p.mustSee ? 100 : 0,
          })
          m.on("click", () => useUi.getState().setUi({ mapPick: p.id }))
          m.addTo(group)
        } else {
          const lat = c.pts.reduce((s, p) => s + p.lat, 0) / c.pts.length
          const lon = c.pts.reduce((s, p) => s + p.lon, 0) / c.pts.length
          const m = L.marker([lat, lon], {
            icon: L.divIcon({ className: "", html: `<div class="tm-cluster">${c.pts.length}</div>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
            title: `${c.pts.length} מקומות`,
          })
          m.on("click", () => {
            const b = L.latLngBounds(c.pts.map((p) => [p.lat, p.lon] as [number, number]))
            map.fitBounds(b, { padding: [60, 60], maxZoom: Math.max(map.getZoom() + 2, CLUSTER_UNTIL_ZOOM) })
          })
          m.addTo(group)
        }
      }
    }
    draw()
    map.on("zoomend", draw)
    return () => {
      map.off("zoomend", draw)
      group.remove()
    }
  }, [map, items, pick, visited])
  return null
}

/** Hotel, and the live "me" dot with accuracy circle and compass cone. */
function OriginLayer({ hotel }: { hotel: LatLon & { label: string } }) {
  const map = useMap()
  const position = useLiveLocation((s) => s.position)
  const meRef = useRef<{ dot: L.Marker; circle: L.Circle } | null>(null)

  useEffect(() => {
    const m = L.marker([hotel.lat, hotel.lon], { icon: hotelIcon, title: hotel.label, zIndexOffset: 900 }).addTo(map)
    m.bindTooltip(hotel.label, { direction: "top", offset: [0, -14] })
    return () => {
      m.remove()
    }
  }, [map, hotel.lat, hotel.lon, hotel.label])

  useEffect(() => {
    if (!position) {
      meRef.current?.dot.remove()
      meRef.current?.circle.remove()
      meRef.current = null
      return
    }
    const ll: L.LatLngExpression = [position.lat, position.lon]
    if (!meRef.current) {
      const circle = L.circle(ll, { radius: position.accuracy, color: "#2f7bf5", weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map)
      const dot = L.marker(ll, {
        icon: L.divIcon({ className: "", html: '<div class="tm-me"><div class="tm-me-cone"></div><div class="tm-me-core"></div></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
        zIndexOffset: 2000,
        interactive: false,
      }).addTo(map)
      meRef.current = { dot, circle }
    } else {
      meRef.current.dot.setLatLng(ll)
      meRef.current.circle.setLatLng(ll).setRadius(position.accuracy)
    }
    const el = meRef.current.dot.getElement()?.querySelector<HTMLElement>(".tm-me")
    if (el && position.heading !== null) {
      el.classList.add("has-heading")
      el.style.setProperty("--heading", `${position.heading}deg`)
    }
  }, [map, position])

  useEffect(
    () => () => {
      meRef.current?.dot.remove()
      meRef.current?.circle.remove()
      meRef.current = null
    },
    []
  )
  return null
}

/** Fits the results (and the origin) whenever the set of results changes. */
function FitResults({ items, origin, signature }: { items: Scored[]; origin: Origin; signature: string }) {
  const map = useMap()
  const pick = useUi((s) => s.mapPick)
  useEffect(() => {
    const near = items.slice(0, 40)
    const pts: [number, number][] = [[origin.lat, origin.lon], ...near.map(({ p }) => [p.lat, p.lon] as [number, number])]
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 16 })
    else map.setView([origin.lat, origin.lon], 14)
    // Only when the filter result changes (signature), not on every pin pick.
  }, [map, signature])
  useEffect(() => {
    if (!pick) return
    const hit = items.find((x) => x.p.id === pick)
    if (hit && !map.getBounds().pad(-0.15).contains([hit.p.lat, hit.p.lon])) map.panTo([hit.p.lat, hit.p.lon])
  }, [map, pick, items])
  return null
}

function MapButtons({ items, origin }: { items: Scored[]; origin: Origin }) {
  const map = useMap()
  const position = useLiveLocation((s) => s.position)
  const openLocation = useUi((s) => s.openLocation)
  const btn = "grid size-11 place-items-center rounded-xl border border-line bg-card text-ink shadow-[var(--shadow)]"
  return (
    <div
      className="absolute end-3 top-3 z-[500] flex flex-col gap-2"
      ref={(el) => {
        if (el) {
          L.DomEvent.disableClickPropagation(el)
          L.DomEvent.disableScrollPropagation(el)
        }
      }}
    >
      <button
        type="button"
        className={btn}
        aria-label="למיקום שלי"
        onClick={() => {
          if (position) map.flyTo([position.lat, position.lon], Math.max(map.getZoom(), 16), { duration: 0.8 })
          else openLocation()
        }}
      >
        <Crosshair className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="להציג את כל התוצאות"
        onClick={() => {
          const pts: [number, number][] = [[origin.lat, origin.lon], ...items.map(({ p }) => [p.lat, p.lon] as [number, number])]
          map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 16 })
        }}
      >
        <Maximize2 className="size-5" aria-hidden />
      </button>
    </div>
  )
}

/** Tapping empty map closes the mini card. */
function ClearPickOnMapTap() {
  const setUi = useUi((s) => s.setUi)
  useMapEvents({ click: () => setUi({ mapPick: null }) })
  return null
}

export function ExploreMap({
  items,
  origin,
  hotel,
  signature,
}: {
  items: Scored[]
  origin: Origin
  hotel: LatLon & { label: string }
  signature: string
}) {
  const online = useOnline()
  return (
    <div className="relative isolate h-[min(62dvh,560px)] overflow-hidden rounded-2xl border border-line">
      <MapContainer
        center={[origin.lat, origin.lon]}
        zoom={14}
        className="size-full"
        zoomControl={false}
        attributionControl
      >
        <ClearPickOnMapTap />
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <PinsLayer items={items} />
        <OriginLayer hotel={hotel} />
        <FitResults items={items} origin={origin} signature={signature} />
        <MapButtons items={items} origin={origin} />
      </MapContainer>
      {!online && (
        <div className="absolute inset-x-3 bottom-3 z-[500] flex items-center gap-2 rounded-xl bg-card/95 px-3 py-2 text-xs text-muted">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          אין אינטרנט: רואים רק אזורי מפה שכבר נטענו. המקומות, המרחקים והסינון עובדים כרגיל.
        </div>
      )}
    </div>
  )
}
