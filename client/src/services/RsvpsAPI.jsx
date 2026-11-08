import { request } from '../utils/request'

// join an event; without an answer the server uses its default "going" answer
const joinEvent = (eventId, rsvpStatus) => request(`/api/events/${eventId}/rsvps`, { method: 'POST', body: rsvpStatus ? { rsvp_status: rsvpStatus } : {} })

// switch the person's own answer
const changeRsvp = (eventId, rsvpStatus) => request(`/api/events/${eventId}/rsvps/me`, { method: 'PATCH', body: { rsvp_status: rsvpStatus } })

// the two answers a person can give ("going" and the other one), so the page never types the words
const getRsvpStatuses = () => request('/api/events/rsvp-statuses')

// the organizer's attendee list and headcount
const getEventRsvps = (eventId) => request(`/api/events/${eventId}/rsvps`)

export default { joinEvent, changeRsvp, getEventRsvps, getRsvpStatuses }
