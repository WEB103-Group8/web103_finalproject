import { Link, Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

// guard a page: role "user" needs a login, role "host" needs a login and a host account
const RequireRole = ({ role = 'user', blockedMessage = 'You do not have access to this page.', children }) => {
  const { user, needsOnboarding, loading } = useSession()
  const location = useLocation()

  // still asking the server who is logged in
  if (loading) return <p role="status">Loading...</p>

  // GitHub users must finish onboarding before using the app
  if (needsOnboarding) return <Navigate to="/onboarding" replace />

  // visitors log in first, and the login page knows where they were going
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // attendees cannot open host-only pages
  if (role === 'host' && !user.is_host) {
    return (
      <section className="blocked-page">
        <h1>Not available</h1>
        <p>{blockedMessage}</p>
        <Link to="/">Back to home</Link>
      </section>
    )
  }

  return children
}

export default RequireRole
