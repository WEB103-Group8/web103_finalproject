import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EventsAPI from '../services/EventsAPI'
import { writeFilters } from '../utils/filterParams'
import { useLoad } from '../utils/useLoad'
import ErrorMessage from './ErrorMessage'
import EventMap from './EventMap'
import Spinner from './Spinner'
import '../css/EventMap.css'

// the map of events for some filters: hovering a pin shows its tooltip, and clicking a pin goes straight to that event
const PinsMap = ({ filters }) => {
  const navigate = useNavigate()
  const [hoveredId, setHoveredId] = useState(null)

  // one pin per event, for the same filters as the rest of the page
  const { data: pins, error, loading, reload } = useLoad(() => EventsAPI.getEventPins(filters), [writeFilters(filters).toString()])

  return (
    <div className="event-map">
      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {pins && <EventMap pins={pins} activeId={hoveredId} onHover={setHoveredId} onSelect={(eventId) => navigate(`/events/${eventId}`)} />}
    </div>
  )
}

export default PinsMap
