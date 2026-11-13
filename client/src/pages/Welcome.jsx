import { Link } from 'react-router-dom'
import FilterBar from '../components/FilterBar'
import PinsMap from '../components/PinsMap'
import ProfileActivity from '../components/ProfileActivity'
import { useSession } from '../context/SessionContext'
import { useFilterBar } from '../utils/useFilterBar'
import '../css/Welcome.css'

// the home page: the pitch, the filters and a map of upcoming events, the same for everyone;
// people who are logged in also get their own events and groups below the map; logging in is only asked for when someone wants to join or create
const Welcome = () => {
  const { user } = useSession()
  const { filterKey, serverFilters, filterBarProps } = useFilterBar(true)

  return (
    <section className="welcome">
      <div className="welcome-hero">
        <h1>FIND YOUR ORBIT</h1>
        <p>Discover events and groups near you, or host your own.</p>
        <Link className="button-link" to="/events">
          Explore events
        </Link>
      </div>

      <h2>Events Near You</h2>
      {/* there is no list here, so there is no page size to pick */}
      <FilterBar key={filterKey} {...filterBarProps} showPerPage={false} />
      <PinsMap filters={serverFilters} />

      {user && <ProfileActivity userId={user.user_id} isSelf />}
    </section>
  )
}

export default Welcome
