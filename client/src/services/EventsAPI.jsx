import { request, toQueryString } from '../utils/request'

// events, with the same filters the page keeps in its address (search, state, city, category, dates, ...)
const getEvents = (filters = {}) => request(`/api/events${toQueryString(filters)}`)

// one small item per event for the map pins, with the same filters
const getEventPins = (filters = {}) => request(`/api/events/pins${toQueryString(filters)}`)

// one event with its group, host, venue and attendee count
const getEvent = (eventId) => request(`/api/events/${eventId}`)

// hosts only: create, edit and delete an event
const createEvent = (event) => request('/api/events', { method: 'POST', body: event })
const updateEvent = (eventId, changes) => request(`/api/events/${eventId}`, { method: 'PATCH', body: changes })
const deleteEvent = (eventId) => request(`/api/events/${eventId}`, { method: 'DELETE' })

export default { getEvents, getEventPins, getEvent, createEvent, updateEvent, deleteEvent }
