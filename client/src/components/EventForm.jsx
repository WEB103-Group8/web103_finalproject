import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkEventValues, toFormErrors } from '../utils/eventForm'
import ConfirmModal from './ConfirmModal'
import ErrorMessage from './ErrorMessage'
import FormField from './FormField'
import GroupPicker from './GroupPicker'
import VenuePicker from './VenuePicker'
import '../css/Forms.css'

// the form shared by creating and editing an event; the page decides what saving does
const EventForm = ({ groups, categories, initialValues, submitLabel, onSubmit, extraActions }) => {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Cancel only needs an "are you sure?" when something was typed
  const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues)

  // groups and categories added from inside this form join the lists straight away
  const [addedGroups, setAddedGroups] = useState([])
  const [addedCategories, setAddedCategories] = useState([])
  const allGroups = [...groups, ...addedGroups]
  const allCategories = [...categories, ...addedCategories.filter((category) => !categories.includes(category))]

  // change one field; picking a start date also fills an empty end date with the same day, since most events end the day they start
  const setField = (name, value) => setValues({ ...values, [name]: value, ...(name === 'date' && !values.end_date ? { end_date: value } : {}) })

  // check what is missing here first, then let the server check the rest and show its answers next to the fields
  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const missing = checkEventValues(values)
    setErrors(missing)
    if (Object.keys(missing).length > 0) return

    setBusy(true)
    try {
      await onSubmit(values)
    } catch (failure) {
      setErrors(toFormErrors(failure.details))
      setFormError(failure.message)
      setBusy(false)
    }
  }

  // a group was just added from the picker: offer it from now on, and remember its category
  const handleGroupCreated = (group) => {
    setAddedGroups([...addedGroups, group])
    setAddedCategories([...addedCategories, group.category])
  }

  // text inputs all work the same way
  const textInput = (name, extra = {}) => (
    <input id={name} value={values[name]} aria-invalid={Boolean(errors[name])} onChange={(event) => setField(name, event.target.value)} {...extra} />
  )

  return (
    <form onSubmit={handleSubmit} noValidate>
      <GroupPicker
        value={values.group_id}
        groups={allGroups}
        categories={allCategories}
        error={errors.group_id}
        onChange={(groupId) => setField('group_id', groupId)}
        onGroupCreated={handleGroupCreated}
      />

      <FormField id="event_title" label="Title" error={errors.event_title}>
        {textInput('event_title')}
      </FormField>

      <FormField id="description" label="Description" error={errors.description}>
        <textarea id="description" rows={4} value={values.description} aria-invalid={Boolean(errors.description)} onChange={(event) => setField('description', event.target.value)} />
      </FormField>

      <div className="form-row">
        <FormField id="date" label="Start date" error={errors.date}>
          {textInput('date', { type: 'date' })}
        </FormField>
        <FormField id="time" label="Start time" error={errors.time}>
          {textInput('time', { type: 'time' })}
        </FormField>
        <FormField id="end_date" label="End date" error={errors.end_date}>
          {textInput('end_date', { type: 'date' })}
        </FormField>
        <FormField id="end_time" label="End time" error={errors.end_time}>
          {textInput('end_time', { type: 'time' })}
        </FormField>
        <FormField id="capacity" label="Capacity" error={errors.capacity}>
          {textInput('capacity', { type: 'number', min: 1 })}
        </FormField>
      </div>

      <FormField id="event_image_url" label="Cover image URL (optional)" error={errors.event_image_url}>
        {textInput('event_image_url', { type: 'url', placeholder: 'https://' })}
      </FormField>
      {values.event_image_url.trim() && <img className="form-preview" src={values.event_image_url.trim()} alt="Cover preview" />}

      <h2>Where</h2>
      <VenuePicker
        value={values.venue}
        online={values.online}
        meetingLink={values.meeting_link}
        error={errors.venue_id ?? errors.meeting_link}
        onChange={(venue) => setField('venue', venue)}
        onOnlineChange={(online) => setValues({ ...values, online, venue: online ? null : values.venue })}
        onMeetingLinkChange={(link) => setField('meeting_link', link)}
      />

      {formError && <ErrorMessage message={formError} />}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {submitLabel}
        </button>
        <button type="button" className="secondary" onClick={() => (hasChanges ? setConfirmingDiscard(true) : navigate(-1))}>
          Cancel
        </button>
        {extraActions}
      </div>

      <ConfirmModal
        open={confirmingDiscard}
        title="Discard your changes?"
        message="What you typed will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => navigate(-1)}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </form>
  )
}

export default EventForm
