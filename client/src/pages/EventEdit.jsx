import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import ConfirmModal from '../components/ConfirmModal'
import ErrorMessage from '../components/ErrorMessage'
import EventForm from '../components/EventForm'
import Spinner from '../components/Spinner'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import CategoriesAPI from '../services/CategoriesAPI'
import EventsAPI from '../services/EventsAPI'
import GroupsAPI from '../services/GroupsAPI'
import { buildEventPayload, changedFields, valuesFromEvent } from '../utils/eventForm'
import { useLoad } from '../utils/useLoad'
import NotFound from './NotFound'
import '../css/Forms.css'

// the form for one event, once it and the host's groups have loaded
const EditView = ({ event, groups, categories }) => {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [problem, setProblem] = useState(null)

  const initialValues = valuesFromEvent(event)

  // send only what changed, so editing an event that already started does not trip the "must start in the future" rule
  const save = async (values) => {
    const changes = changedFields(buildEventPayload(initialValues), buildEventPayload(values))
    if (Object.keys(changes).length > 0) {
      await EventsAPI.updateEvent(event.event_id, changes)
      notify('Event updated.')
    } else {
      notify('There were no changes to save.')
    }
    navigate(`/events/${event.event_id}`)
  }

  // delete the event after the host confirmed, then go back to the list
  const deleteEvent = async () => {
    setConfirmingDelete(false)
    setProblem(null)

    try {
      await EventsAPI.deleteEvent(event.event_id)
      notify('Event deleted.')
      navigate('/events')
    } catch (failure) {
      setProblem(failure.message)
    }
  }

  return (
    <section className="form-page">
      <h1>Edit Event</h1>
      <EventForm
        groups={groups}
        categories={categories}
        initialValues={initialValues}
        submitLabel="Save changes"
        onSubmit={save}
        extraActions={
          <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>
            Delete event
          </button>
        }
      />
      {problem && <ErrorMessage message={problem} />}

      <ConfirmModal
        open={confirmingDelete}
        title="Delete this event?"
        message="This removes the event and every RSVP for it. It cannot be undone."
        confirmLabel="Delete"
        onConfirm={deleteEvent}
        onCancel={() => setConfirmingDelete(false)}
      />
    </section>
  )
}

// the page where a host edits one of their own events
const EventEdit = () => {
  const { eventId } = useParams()
  const { user } = useSession()

  const { data, error, notFound, loading, reload } = useLoad(
    async () => {
      const [event, groups, categories] = await Promise.all([EventsAPI.getEvent(eventId), GroupsAPI.getGroups(), CategoriesAPI.getCategories()])
      return { event, groups: groups.filter((group) => group.organizer_id === user.user_id), categories }
    },
    [eventId, user.user_id],
  )

  if (loading) return <Spinner />
  if (notFound) return <NotFound />

  if (error) {
    return (
      <div className="form-page">
        <BackButton />
        <ErrorMessage message={error} onRetry={reload} />
      </div>
    )
  }

  // hosts can only edit their own events
  if (data.event.host_id !== user.user_id) {
    return (
      <section className="blocked-page">
        <h1>Not available</h1>
        <p>You can only edit events you host.</p>
        <Link to={`/events/${eventId}`}>Back to the event</Link>
      </section>
    )
  }

  return <EditView event={data.event} groups={data.groups} categories={data.categories} />
}

export default EventEdit
