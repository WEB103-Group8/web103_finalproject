import { Link } from 'react-router-dom'
import '../css/NotFound.css'

// shown for any address that matches no page, and for an event, group or person that does not exist
const NotFound = () => (
  <section className="not-found">
    <p className="not-found-code">404</p>
    <h1>Page not found</h1>
    <p>We could not find the page you were looking for. It may have moved, or the link may be wrong.</p>
    <Link className="orbit-button" to="/">
      Back to Orbit
    </Link>
  </section>
)

export default NotFound
