// these tests check that every service asks the server for the right address, method and body (no network needed)
import { beforeEach, describe, expect, it, vi } from 'vitest'

// replace the real request helper with one the test controls
vi.mock('../utils/request', async (importOriginal) => ({ ...(await importOriginal()), request: vi.fn() }))

const { request } = await import('../utils/request')
const { default: EventsAPI } = await import('./EventsAPI')
const { default: RsvpsAPI } = await import('./RsvpsAPI')
const { default: GroupsAPI } = await import('./GroupsAPI')
const { default: VenuesAPI } = await import('./VenuesAPI')
const { default: UsersAPI } = await import('./UsersAPI')
const { default: CitiesAPI } = await import('./CitiesAPI')
const { default: CategoriesAPI } = await import('./CategoriesAPI')

beforeEach(() => {
  request.mockReset()
  request.mockResolvedValue({ ok: true })
})

describe('EventsAPI', () => {
  it('reads events and pins with filters, leaving out empty ones', async () => {
    await EventsAPI.getEvents({ state: 'TX', q: '' })
    await EventsAPI.getEventPins({ category: 'Food' })
    await EventsAPI.getEvents()

    expect(request).toHaveBeenNthCalledWith(1, '/api/events?state=TX')
    expect(request).toHaveBeenNthCalledWith(2, '/api/events/pins?category=Food')
    expect(request).toHaveBeenNthCalledWith(3, '/api/events')
  })

  it('reads one event and lets hosts create, edit and delete', async () => {
    await EventsAPI.getEvent(4)
    await EventsAPI.createEvent({ event_title: 'Jam' })
    await EventsAPI.updateEvent(4, { capacity: 10 })
    await EventsAPI.deleteEvent(4)

    expect(request.mock.calls).toEqual([
      ['/api/events/4'],
      ['/api/events', { method: 'POST', body: { event_title: 'Jam' } }],
      ['/api/events/4', { method: 'PATCH', body: { capacity: 10 } }],
      ['/api/events/4', { method: 'DELETE' }],
    ])
  })
})

describe('RsvpsAPI', () => {
  it('joins, changes and lists attendees', async () => {
    await RsvpsAPI.joinEvent(4)
    await RsvpsAPI.joinEvent(4, 'maybe')
    await RsvpsAPI.changeRsvp(4, 'no')
    await RsvpsAPI.getEventRsvps(4)
    await RsvpsAPI.getRsvpStatuses()

    expect(request.mock.calls).toEqual([
      ['/api/events/4/rsvps', { method: 'POST', body: {} }],
      ['/api/events/4/rsvps', { method: 'POST', body: { rsvp_status: 'maybe' } }],
      ['/api/events/4/rsvps/me', { method: 'PATCH', body: { rsvp_status: 'no' } }],
      ['/api/events/4/rsvps'],
      ['/api/events/rsvp-statuses'],
    ])
  })
})

describe('GroupsAPI', () => {
  it('reads groups and lets hosts create, edit and delete', async () => {
    await GroupsAPI.getGroups({ category: 'Food' })
    await GroupsAPI.getGroup(2)
    await GroupsAPI.createGroup({ group_name: 'Cooks' })
    await GroupsAPI.updateGroup(2, { description: 'x' })
    await GroupsAPI.deleteGroup(2)

    expect(request.mock.calls).toEqual([
      ['/api/groups?category=Food'],
      ['/api/groups/2'],
      ['/api/groups', { method: 'POST', body: { group_name: 'Cooks' } }],
      ['/api/groups/2', { method: 'PATCH', body: { description: 'x' } }],
      ['/api/groups/2', { method: 'DELETE' }],
    ])
  })

  it('lists members, joins and leaves', async () => {
    await GroupsAPI.getGroupMembers(2)
    await GroupsAPI.joinGroup(2)
    await GroupsAPI.leaveGroup(2)

    expect(request.mock.calls).toEqual([
      ['/api/groups/2/members'],
      ['/api/groups/2/members', { method: 'POST' }],
      ['/api/groups/2/members/me', { method: 'DELETE' }],
    ])
  })
})

describe('VenuesAPI', () => {
  it('reads venues, looks an address up and saves only the name and address', async () => {
    await VenuesAPI.getVenues({ city: 'Austin' })
    await VenuesAPI.getVenue(9)
    await VenuesAPI.lookupVenue('500 W 2nd St, Austin, TX 78701')
    await VenuesAPI.createVenue('City Hall', '500 W 2nd St, Austin, TX 78701')

    expect(request.mock.calls).toEqual([
      ['/api/venues?city=Austin'],
      ['/api/venues/9'],
      ['/api/venues/lookup', { method: 'POST', body: { address: '500 W 2nd St, Austin, TX 78701' } }],
      ['/api/venues', { method: 'POST', body: { venue_name: 'City Hall', address: '500 W 2nd St, Austin, TX 78701' } }],
    ])
  })
})

describe('UsersAPI, CitiesAPI and CategoriesAPI', () => {
  it('reads profiles and events of a person, and edits your own profile', async () => {
    await UsersAPI.getUser(3)
    await UsersAPI.getUserEvents(3, 'attending')
    await UsersAPI.getUserEvents(3)
    await UsersAPI.getUserGroups(3)
    await UsersAPI.updateMe({ city: 'Austin' })

    expect(request.mock.calls).toEqual([
      ['/api/users/3'],
      ['/api/users/3/events?role=attending'],
      ['/api/users/3/events'],
      ['/api/users/3/groups'],
      ['/api/users/me', { method: 'PATCH', body: { city: 'Austin' } }],
    ])
  })

  it('reads the city and category lists', async () => {
    await CitiesAPI.getCities()
    await CategoriesAPI.getCategories()

    expect(request.mock.calls).toEqual([['/api/cities'], ['/api/categories']])
  })
})
