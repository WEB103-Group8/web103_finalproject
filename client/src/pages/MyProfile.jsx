import { useState } from 'react'
import Avatar from '../components/Avatar'
import ErrorMessage from '../components/ErrorMessage'
import ProfileForm from '../components/ProfileForm'
import Spinner from '../components/Spinner'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import CitiesAPI from '../services/CitiesAPI'
import UsersAPI from '../services/UsersAPI'
import { useLoad } from '../utils/useLoad'
import '../css/Profile.css'

// the profile as it was loaded or last saved, with the form to change it
const ProfileView = ({ initial, states }) => {
  const { refresh } = useSession()
  const { notify } = useToast()
  const [profile, setProfile] = useState(initial)

  // a GitHub person starts without a state, country and ZIP code, so they are asked to add them
  const incomplete = !profile.state || !profile.country || !profile.zipcode

  // save the changes, show the new profile and a pop-up message, and let the header pick up the new name and photo
  const save = async (values) => {
    setProfile(await UsersAPI.updateMe(values))
    notify('Profile saved.')
    refresh()
  }

  return (
    <section className="profile-page">
      <div className="profile-header">
        <Avatar name={profile.full_name} imageUrl={profile.user_image_url} />
        <div>
          <h1>{profile.full_name}</h1>
          <p>{profile.email}</p>
          <p>{[profile.city, profile.state, profile.zipcode, profile.country].filter(Boolean).join(', ')}</p>
        </div>
      </div>

      {incomplete && (
        <p className="profile-prompt" role="note">
          Complete your profile: add your state, country and ZIP code so Orbit can show you events near you.
        </p>
      )}

      <h2>Edit profile</h2>
      <ProfileForm profile={profile} states={states} onSave={save} />
    </section>
  )
}

// the logged-in person's own page: only their profile, with their details (email included) and a form to change them
const MyProfile = () => {
  const { user } = useSession()

  // the states that have events on Orbit, for the suggestion list
  const { data, error, loading, reload } = useLoad(
    async () => {
      const [profile, cities] = await Promise.all([UsersAPI.getUser(user.user_id), CitiesAPI.getCities().catch(() => [])])
      return { profile, states: [...new Set(cities.map((place) => place.state))].sort() }
    },
    [user.user_id],
  )

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={reload} />

  return <ProfileView initial={data.profile} states={data.states} />
}

export default MyProfile
