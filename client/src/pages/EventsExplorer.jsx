import CreateButton from '../components/CreateButton'
import EventCard from '../components/EventCard'
import ListBrowser from '../components/ListBrowser'
import EventsAPI from '../services/EventsAPI'
import '../css/ListPage.css'

// browse events as cards, with the filters and pages; the filters live in the address so a search can be shared
const EventsExplorer = () => (
  <section className="list-page">
    <div className="page-heading">
      <h1>Events</h1>
      <CreateButton to="/events/new">Create Event</CreateButton>
    </div>
    <ListBrowser loadItems={EventsAPI.getEvents} renderItem={(event) => <EventCard event={event} />} getKey={(event) => event.event_id} noun="event" />
  </section>
)

export default EventsExplorer
