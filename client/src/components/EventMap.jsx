import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { formatEventTime } from '../utils/dates'
import { activePinIcon, pinIcon } from '../utils/mapIcon'
import { spreadPins } from '../utils/mapPins'
import 'leaflet/dist/leaflet.css'
import '../css/EventMap.css'

// where the map starts, centred on the United States, and the closest it zooms when fitting a few pins
const US_CENTER = [39.5, -98.35]
const US_ZOOM = 4
const MAX_FIT_ZOOM = 12
const FIT_PADDING = [30, 30]

// move the map so every pin is in view whenever the pins change (the filters changed)
const FitToPins = ({ positions }) => {
  const map = useMap()

  useEffect(() => {
    // a map with no size yet (before it is on the screen) cannot be fitted
    if (map.getSize().x === 0) return

    if (positions.length === 0) map.setView(US_CENTER, US_ZOOM)
    else map.fitBounds(positions, { padding: FIT_PADDING, maxZoom: MAX_FIT_ZOOM })
  }, [map, positions])

  return null
}

// a map with one pin per event; hovering shows a tooltip, clicking selects the event, and the active pin stands out
const EventMap = ({ pins, activeId, onHover, onSelect }) => {
  const spread = useMemo(() => spreadPins(pins), [pins])
  const positions = useMemo(() => spread.map((pin) => pin.position), [spread])

  return (
    <MapContainer className="event-map-canvas" center={US_CENTER} zoom={US_ZOOM} scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitToPins positions={positions} />

      {spread.map((pin) => (
        <Marker
          key={pin.event_id}
          position={pin.position}
          icon={pin.event_id === activeId ? activePinIcon : pinIcon}
          zIndexOffset={pin.event_id === activeId ? 1000 : 0}
          eventHandlers={{
            click: () => onSelect(pin.event_id),
            mouseover: () => onHover(pin.event_id),
            mouseout: () => onHover(null),
          }}
        >
          <Tooltip>
            <strong>{pin.event_title}</strong>
            <br />
            {formatEventTime(pin.start_time, pin.timezone)}
            <br />
            {pin.category}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default EventMap
