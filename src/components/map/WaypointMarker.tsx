import { Marker, Popup } from "react-leaflet"
import { createWaypointIcon } from "@/components/map/icons"
import { formatHebrewDate } from "@/lib/format"
import { waypointGroupLabel, type WaypointGroup } from "@/lib/waypointGroups"
import { WAYPOINT_MODE_STYLE } from "@/lib/waypointStyle"

export function WaypointMarker({ group }: { group: WaypointGroup }) {
  const label = waypointGroupLabel(group)
  const ringColor = WAYPOINT_MODE_STYLE[group.entries[0]!.waypoint.mode].color
  const srLabel = `תחנת ביניים ${label}: ${group.entries.map((e) => e.waypoint.nameHe ?? e.waypoint.name).join(", ")}`

  return (
    <Marker position={[group.lat, group.lon]} icon={createWaypointIcon(label, ringColor, srLabel)}>
      <Popup className="trip-map-popup">
        <div className="flex min-w-44 flex-col gap-2 text-end">
          {group.entries.map(({ leg, waypoint }) => {
            const style = WAYPOINT_MODE_STYLE[waypoint.mode]
            return (
              <div key={waypoint.id} className="flex flex-col gap-0.5 border-b border-border pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-semibold">{waypoint.nameHe ?? waypoint.name}</span>
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {waypoint.id}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatHebrewDate(leg.date, true)}
                  {waypoint.departTime ? ` · ${waypoint.departTime}` : ""}
                </span>
                <span className="text-xs" style={{ color: style.color }}>
                  {style.emoji} {style.labelHe}
                  {waypoint.trainNumber ? ` · ${waypoint.trainNumber}` : ""}
                </span>
                {waypoint.note && <span className="text-xs text-muted-foreground">{waypoint.note}</span>}
              </div>
            )
          })}
        </div>
      </Popup>
    </Marker>
  )
}
