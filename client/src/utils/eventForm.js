// a date and a clock time as a number of milliseconds; both are read the same way, so the difference between two of them is the real time between them
const toMilliseconds = (date, time) => Date.parse(`${date}T${time}:00Z`)

// how long an event lasts, in minutes, from its start and end dates and clock times (events can last several days)
export const minutesBetween = (startDate, startTime, endDate, endTime) => Math.round((toMilliseconds(endDate, endTime) - toMilliseconds(startDate, startTime)) / 60000)

// check the form values before asking the server: only what is missing, with a message per field
export const checkEventValues = (values) => {
  const errors = {}

  if (!values.group_id) errors.group_id = 'Choose a group from the list, or add a new one.'
  // where it happens: a meeting link for an online event, otherwise a venue
  if (values.online) {
    const link = values.meeting_link.trim()
    if (!link) errors.meeting_link = 'Enter the meeting link.'
    else if (!/^https?:\/\/\S+$/i.test(link)) errors.meeting_link = 'The meeting link must be a web address starting with http:// or https://.'
  } else if (!values.venue) {
    errors.venue_id = 'Choose or add a venue.'
  }
  if (!values.event_title.trim()) errors.event_title = 'Title is required.'
  if (!values.description.trim()) errors.description = 'Description is required.'
  if (!values.date) errors.date = 'Start date is required.'
  if (!values.time) errors.time = 'Start time is required.'
  if (!values.end_date) errors.end_date = 'End date is required.'
  if (!values.end_time) errors.end_time = 'End time is required.'
  if (!String(values.capacity).trim()) errors.capacity = 'Capacity is required.'

  // the end has to come after the start (checked once all four are filled in)
  const hasWhole = values.date && values.time && values.end_date && values.end_time
  if (hasWhole && minutesBetween(values.date, values.time, values.end_date, values.end_time) <= 0) errors.end_date = 'The end must be after the start.'

  return errors
}

// turn the form values into what the server expects: the length comes from the start and end times
export const buildEventPayload = (values) => ({
  group_id: Number(values.group_id),
  // an online event has a meeting link and no venue; an event at a venue has no meeting link
  venue_id: values.online ? null : values.venue.venue_id,
  meeting_link: values.online ? values.meeting_link.trim() : null,
  event_title: values.event_title.trim(),
  description: values.description.trim(),
  date: values.date,
  time: values.time,
  duration_minutes: minutesBetween(values.date, values.time, values.end_date, values.end_time),
  capacity: Number(values.capacity),
  event_image_url: values.event_image_url.trim(),
})

// fill the form from an event the server sent: its start and end dates and times are read from the timestamps
export const valuesFromEvent = (event) => ({
  group_id: String(event.group_id),
  online: event.venue_id === null,
  meeting_link: event.meeting_link ?? '',
  venue:
    event.venue_id === null
      ? null
      : {
          venue_id: event.venue_id,
          venue_name: event.venue_name,
          address: event.address,
          city: event.city,
          state: event.state,
          postal_code: event.postal_code,
          latitude: event.latitude,
          longitude: event.longitude,
        },
  event_title: event.event_title,
  description: event.description,
  date: event.start_time.slice(0, 10),
  time: event.start_time.slice(11, 16),
  end_date: event.end_time.slice(0, 10),
  end_time: event.end_time.slice(11, 16),
  capacity: String(event.capacity),
  event_image_url: event.event_image_url ?? '',
})

// only the fields that are different, so an edit sends just what changed
export const changedFields = (before, after) => Object.fromEntries(Object.entries(after).filter(([name, value]) => value !== before[name]))

// the server calls the length "duration_minutes" and the venue "venue_id"; the form shows them as the end time and the venue picker
export const toFormErrors = (details = {}) => {
  const { duration_minutes: duration, ...rest } = details
  return duration ? { ...rest, end_time: duration } : rest
}
