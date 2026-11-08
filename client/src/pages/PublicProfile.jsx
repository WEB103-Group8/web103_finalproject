import { Navigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import BackButton from '../components/BackButton'
import ErrorMessage from '../components/ErrorMessage'
import ProfileActivity from '../components/ProfileActivity'
import Spinner from '../components/Spinner'
import { useSession } from '../context/SessionContext'
import UsersAPI from '../services/UsersAPI'
import { useLoad } from '../utils/useLoad'
import NotFound from './NotFound'
import '../css/Profile.css'

// anyone else's profile: name, where they are, the events they go to or host, and their groups (no email or other private details);
// your own address leads to My Collection
const PublicProfile = () => {
  const { userId } = useParams()
  const { user } = useSession()
  const { data: person, error, notFound, loading, reload } = useLoad(() => UsersAPI.getUser(userId), [userId])

  // looking at yourself means looking at your own collection
  if (user && String(user.user_id) === userId) return <Navigate to="/collection" replace />

  if (loading) return <Spinner />
  if (notFound) return <NotFound />

  if (error) {
    return (
      <div className="profile-page">
        <BackButton />
        <ErrorMessage message={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <section className="profile-page">
      <BackButton />
      <div className="profile-header">
        <Avatar name={person.full_name} imageUrl={person.user_image_url} />
        <div>
          <h1>{person.full_name}</h1>
          {(person.city || person.state) && <p>{[person.city, person.state].filter(Boolean).join(', ')}</p>}
        </div>
      </div>

      <ProfileActivity userId={person.user_id} isSelf={false} />
    </section>
  )
}

export default PublicProfile
