import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// the shape shared by every pin, drawn small so many events fit on the map; Leaflet cannot find its own pictures when bundled, so they are given here
const pinShape = { iconUrl, iconRetinaUrl, shadowUrl, iconSize: [12, 20], iconAnchor: [6, 20], popupAnchor: [0, -16], tooltipAnchor: [6, -14], shadowSize: [20, 20] }

// the normal map pin
export const pinIcon = L.icon(pinShape)

// the pin of the event that is hovered or opened: a little bigger and a different colour (the colour comes from the "pin-active" style)
export const activePinIcon = L.icon({ ...pinShape, iconSize: [18, 29], iconAnchor: [9, 29], tooltipAnchor: [9, -20], shadowSize: [29, 29], className: 'pin-active' })
