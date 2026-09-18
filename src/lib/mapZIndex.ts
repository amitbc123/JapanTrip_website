/** Marker stacking order (Leaflet's `zIndexOffset`) — hotels (the primary
 *  numbered route) always render above the finer-grained layers, which
 *  otherwise stack in arbitrary DOM/creation order and can bury a hotel
 *  number under a waypoint or transport bubble in a dense cluster (e.g. the
 *  Kansai/Chubu leg of a Japan trip). */
export const MARKER_Z_HOTEL = 1000
export const MARKER_Z_ATTRACTION = 500
export const MARKER_Z_WAYPOINT = 200
export const MARKER_Z_TRANSPORT_ICON = 100
