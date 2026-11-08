import { useNavigate, useSearchParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import EventForm from '../components/EventForm'
import Spinner from '../components/Spinner'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import CategoriesAPI from '../services/CategoriesAPI'
import EventsAPI from '../services/EventsAPI'
import GroupsAPI from '../services/GroupsAPI'
import { buildEventPayload } from '../utils/eventForm'
import { useLoad } from '../utils/useLoad'
import '../css/Forms.css'

// an empty form, with the group already chosen when the page was opened from a group
const blankValues = (groupId) => ({
  group_id: groupId,
  venue: null,
  online: false,
  meeting_link: '',
  event_title: '',
  description: '',
  date: '',
  time: '',
  end_date: '',
  end_time: '',
  capacity: '',
  event_image_url: '',
})

// the page where a host creates an event for one of their own groups (a new group can be added right in the form)
const EventCreate = () => {
  const { user } = useSession()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [searchParams] = useSearchParams()

  // only the groups this host organizes, and the categories a new group can use
  const { data, error, loading, reload } = useLoad(
    async () => {
      const [all, categories] = await Promise.all([GroupsAPI.getGroups(), CategoriesAPI.getCategories()])
      return { groups: all.filter((group) => group.organizer_id === user.user_id), categories }
    },
    [user.user_id],
  )

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={reload} />

  const { groups, categories } = data
  const wantedGroup = searchParams.get('group')
  const groupId = groups.some((group) => String(group.group_id) === wantedGroup) ? wantedGroup : ''

  // save the event, then show it
  const save = async (values) => {
    const created = await EventsAPI.createEvent(buildEventPayload(values))
    notify('Event created.')
    navigate(`/events/${created.event_id}`)
  }

  return (
    <section className="form-page">
      <h1>Create Event</h1>
      <EventForm groups={groups} categories={categories} initialValues={blankValues(groupId)} submitLabel="Create Event" onSubmit={save} />
    </section>
  )
}

export default EventCreate
