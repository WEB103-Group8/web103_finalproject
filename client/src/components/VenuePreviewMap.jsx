import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { pinIcon } from '../utils/mapIcon'
import 'leaflet/dist/leaflet.css'
import '../css/VenuePreviewMap.css'

// how close the small map is zoomed in on a single venue
const VENUE_ZOOM = 15

// a small read-only map with one pin, so a host can check the address was found where they expect
const VenuePreviewMap = ({ latitude, longitude, label }) => (
  <div className="venue-preview-map" role="img" aria-label={label ? `Map showing ${label}` : 'Map showing the venue'}>
    <MapContainer center={[latitude, longitude]} zoom={VENUE_ZOOM} scrollWheelZoom={false} dragging={false} zoomControl={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[latitude, longitude]} icon={pinIcon} />
    </MapContainer>
  </div>
)

export default VenuePreviewMap
