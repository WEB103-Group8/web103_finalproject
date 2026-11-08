import { Link } from 'react-router-dom'
import '../css/Feedback.css'

// shown when a list has nothing in it, with an optional link to what to do next
const EmptyState = ({ title, message, actionLabel, actionTo }) => (
  <section className="empty-state">
    <h2>{title}</h2>
    {message && <p>{message}</p>}
    {actionLabel && actionTo && <Link to={actionTo}>{actionLabel}</Link>}
  </section>
)

export default EmptyState
