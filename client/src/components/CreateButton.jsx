import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import '../css/OrbitHeader.css'

// the "Create ..." button at the top of the Events and Groups pages: hosts go to the form, visitors are sent to log in, and attendees do not get one
const CreateButton = ({ to, children }) => {
  const { user, loading } = useSession()

  if (loading || (user && !user.is_host)) return null

  return (
    <Link className="button-link" to={user ? to : '/login'} state={user ? undefined : { from: to }}>
      {children}
    </Link>
  )
}

export default CreateButton
