// these tests open every Orbit address through the real route table, as a visitor, and check the right page appears
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

// replace every service with one that answers straight away
vi.mock('./services/SessionAPI', () => ({ default: { getSession: vi.fn().mockResolvedValue({ user: null, needsOnboarding: false }), logout: vi.fn() } }))
vi.mock('./services/CategoriesAPI', () => ({ default: { getCategories: vi.fn().mockResolvedValue([]) } }))
vi.mock('./services/CitiesAPI', () => ({ default: { getCities: vi.fn().mockResolvedValue([]) } }))
vi.mock('./services/RsvpsAPI', () => ({ default: { getRsvpStatuses: vi.fn().mockResolvedValue({ attending: 'a', notAttending: 'b' }) } }))
vi.mock('./services/EventsAPI', () => ({
  default: {
    getEvents: vi.fn().mockResolvedValue([]),
    getEventPins: vi.fn().mockResolvedValue([]),
    getEvent: vi.fn().mockResolvedValue({ event_id: 1, group_id: 1, event_title: 'Sample Event', host_id: 9, host_name: 'Host', group_name: 'Group', start_time: '2099-01-01T10:00:00', venue_name: 'Hall', address: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', capacity: 5, rsvp_count: 0, my_rsvp: null, is_attending: false, description: 'x' }),
  },
}))
vi.mock('./services/UsersAPI', () => ({
  default: {
    getUser: vi.fn().mockResolvedValue({ user_id: 1, full_name: 'Sample Person', city: 'Austin', state: 'TX' }),
    getUserEvents: vi.fn().mockResolvedValue([]),
    getUserGroups: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('./services/GroupsAPI', () => ({
  default: {
    getGroups: vi.fn().mockResolvedValue([]),
    getGroup: vi.fn().mockResolvedValue({ group_id: 1, group_name: 'Sample Group', category: 'Food', organizer_id: 9, organizer_name: 'Host', member_count: 2 }),
  },
}))

const { default: OrbitRoutes } = await import('./OrbitRoutes')

// open an address and draw whatever page the route table gives
const openAddress = (address) =>
  render(
    <MemoryRouter initialEntries={[address]}>
      <Routes>
        <Route path="/login" element={<h1>Login page</h1>} />
        {OrbitRoutes()}
      </Routes>
    </MemoryRouter>,
  )

describe('OrbitRoutes', () => {
  it.each([
    ['/', 'FIND YOUR ORBIT'],
    ['/events', 'Events'],
    ['/events/1', 'Sample Event'],
    ['/groups', 'Groups'],
    ['/groups/1', 'Sample Group'],
    ['/users/1', 'Sample Person'],
    ['/nowhere', 'Page not found'],
    // pages that need a login send a visitor to log in
    ['/profile', 'Login page'],
    ['/collection', 'Login page'],
    ['/events/new', 'Login page'],
    ['/events/1/edit', 'Login page'],
    ['/groups/new', 'Login page'],
    ['/groups/1/edit', 'Login page'],
  ])('opens %s and shows "%s"', async (address, heading) => {
    openAddress(address)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    if (address !== '/nowhere') expect(screen.queryByText('Page not found')).not.toBeInTheDocument()
  })
})
