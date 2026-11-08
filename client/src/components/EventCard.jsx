import { Link } from 'react-router-dom'
import { formatEventRange } from '../utils/dates'
import '../css/Cards.css'

// one event as a card: cover, title, group, time, place and how many are going
const EventCard = ({ event }) => (
  <Link to={`/events/${event.event_id}`} className="card event-card">
    {event.event_image_url && <img src={event.event_image_url} alt="" loading="lazy" />}
    <div className="card-body">
      <h3>{event.event_title}</h3>
      <p>{event.group_name}</p>
      <p>{formatEventRange(event.start_time, event.end_time, event.timezone)}</p>
      <p>{event.venue_id === null ? 'Online' : `${event.city}, ${event.state}`}</p>
      <p>{event.rsvp_count} attending</p>
    </div>
  </Link>
)

export default EventCard
