import L from "leaflet"
import { useEffect } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import { glyphHtml, mainCat } from "@/treasure/data"
import type { LatLon, Place } from "@/treasure/types"

const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"

function Stops({ hotel, stops }: { hotel: LatLon & { label: string }; stops: Place[] }) {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    const pts: [number, number][] = [[hotel.lat, hotel.lon], ...stops.map((p) => [p.lat, p.lon] as [number, number])]
    L.polyline(pts, { color: "#f5c443", weight: 3, dashArray: "6 7", opacity: 0.9 }).addTo(group)
    L.marker([hotel.lat, hotel.lon], {
      icon: L.divIcon({ className: "", html: `<div class="tm-hotel">${glyphHtml("bed")}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] }),
      title: hotel.label,
    }).addTo(group)
    stops.forEach((p, i) => {
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: "",
          html: `<div class="tm-num" style="--c:${mainCat(p).color}">${i + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        title: `${i + 1}. ${p.en}`,
        zIndexOffset: 100 + i,
      })
        .bindTooltip(`${i + 1}. ${p.he}`, { direction: "top", offset: [0, -12] })
        .addTo(group)
    })
    map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 16 })
    return () => {
      group.remove()
    }
  }, [map, hotel.lat, hotel.lon, hotel.label, stops])
  return null
}

export function PlanMap({ hotel, stops }: { hotel: LatLon & { label: string }; stops: Place[] }) {
  return (
    <div className="isolate h-64 overflow-hidden rounded-2xl border border-line">
      <MapContainer center={[hotel.lat, hotel.lon]} zoom={13} className="size-full" zoomControl={false}>
        <TileLayer url={TILE_URL} attribution="Tiles &copy; Esri, &copy; OpenStreetMap contributors" maxZoom={19} />
        <Stops hotel={hotel} stops={stops} />
      </MapContainer>
    </div>
  )
}
