import { Link } from 'react-router-dom'
import ProfileActivity from '../components/ProfileActivity'
import { useSession } from '../context/SessionContext'
import '../css/Profile.css'

// the logged-in person's collection: the events they host or attend and the groups they organize or joined
const MyCollection = () => {
  const { user } = useSession()

  return (
    <section className="profile-page">
      <h1>My Collection</h1>
      <p>
        <Link className="button-link"to="/profile">Edit my profile</Link>
      </p>

      <ProfileActivity userId={user.user_id} isSelf />
    </section>
  )
}

export default MyCollection
