import { request, toQueryString } from '../utils/request'

// venues, with filters (search, state, city)
const getVenues = (filters = {}) => request(`/api/venues${toQueryString(filters)}`)

// one venue
const getVenue = (venueId) => request(`/api/venues/${venueId}`)

// hosts only: find an address on the map without saving anything
const lookupVenue = (address) => request('/api/venues/lookup', { method: 'POST', body: { address } })

// hosts only: save a venue from just its name and address; the server finds the map position
const createVenue = (venueName, address) => request('/api/venues', { method: 'POST', body: { venue_name: venueName, address } })

export default { getVenues, getVenue, lookupVenue, createVenue }
