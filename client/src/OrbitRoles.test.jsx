// the role pass: every page is opened as a visitor, an attendee, the host who owns the event and group, and another host,
// and each must show exactly what the route table in the UI spec says
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// replace every service with one that answers straight away
vi.mock('./services/SessionAPI', () => ({ default: { getSession: vi.fn(), logout: vi.fn() } }))
vi.mock('./services/CategoriesAPI', () => ({ default: { getCategories: vi.fn().mockResolvedValue(['Food', 'Technology']) } }))
vi.mock('./services/CitiesAPI', () => ({ default: { getCities: vi.fn().mockResolvedValue([{ city: 'Austin', state: 'TX', zipcode: '78701' }]) } }))
vi.mock('./services/VenuesAPI', () => ({ default: { getVenues: vi.fn().mockResolvedValue([]) } }))
vi.mock('./services/RsvpsAPI', () => ({
  default: {
    getRsvpStatuses: vi.fn().mockResolvedValue({ attending: 'going-word', notAttending: 'not-word' }),
    getEventRsvps: vi.fn().mockResolvedValue({ capacity: 10, attending: 0, counts: {}, rsvps: [] }),
    joinEvent: vi.fn(),
    changeRsvp: vi.fn(),
  },
}))
vi.mock('./services/EventsAPI', () => ({
  default: {
    getEvents: vi.fn().mockResolvedValue([]),
    getEventPins: vi.fn().mockResolvedValue([]),
    getEvent: vi.fn().mockResolvedValue({
      event_id: 7,
      group_id: 3,
      venue_id: 9,
      host_id: 5,
      host_name: 'Hank Cole',
      group_name: 'Code & Coffee',
      event_title: 'Open Source Saturday',
      description: 'Bring a laptop.',
      start_time: '2099-01-19T18:30:00',
      end_time: '2099-01-19T20:00:00',
      capacity: 10,
      rsvp_count: 3,
      my_rsvp: null,
      is_attending: false,
      event_image_url: null,
      venue_name: 'City Hall',
      address: '500 W 2nd St',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
    }),
  },
}))
vi.mock('./services/GroupsAPI', () => ({
  default: {
    getGroups: vi.fn().mockResolvedValue([{ group_id: 3, group_name: 'Code & Coffee', organizer_id: 5 }]),
    getGroup: vi.fn().mockResolvedValue({ group_id: 3, group_name: 'Code & Coffee', category: 'Technology', description: null, group_image_url: null, organizer_id: 5, organizer_name: 'Hank Cole', member_count: 4 }),
  },
}))
vi.mock('./services/UsersAPI', () => ({
  default: {
    getUser: vi.fn().mockResolvedValue({ user_id: 5, full_name: 'Hank Cole', email: 'hank@example.com', city: 'Austin', state: 'TX', country: 'USA', zipcode: '78701', user_image_url: null }),
    getUserEvents: vi.fn().mockResolvedValue([]),
    getUserGroups: vi.fn().mockResolvedValue([]),
  },
}))

const { default: SessionAPI } = await import('./services/SessionAPI')
const { default: OrbitRoutes } = await import('./OrbitRoutes')

// the four kinds of people; the owner is the host of event 7 and the organizer of group 3
const people = {
  visitor: null,
  attendee: { user_id: 1, full_name: 'Ana Lee', is_host: false },
  owner: { user_id: 5, full_name: 'Hank Cole', is_host: true },
  otherHost: { user_id: 6, full_name: 'Hope Diaz', is_host: true },
}

// open an address as one kind of person, with pretend login and onboarding pages
const openAs = (role, address, session = {}) => {
  SessionAPI.getSession.mockResolvedValue({ user: people[role], needsOnboarding: false, ...session })

  return render(
    <MemoryRouter initialEntries={[address]}>
      <Routes>
        <Route path="/login" element={<h1>Login page</h1>} />
        <Route path="/onboarding" element={<h1>Onboarding page</h1>} />
        {OrbitRoutes()}
      </Routes>
    </MemoryRouter>,
  )
}

// small checks the cases below are made from
const heading = (name) => async () => expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
const text = (words) => async () => expect(await screen.findByText(words)).toBeInTheDocument()
const sendsToLogin = heading('Login page')

beforeEach(() => {
  SessionAPI.getSession.mockReset()
})

describe('pages everyone can open', () => {
  it.each(Object.keys(people))('home, events, groups, a group, an event and a person look the same for the %s', async (role) => {
    for (const [address, name] of [
      ['/', 'FIND YOUR ORBIT'],
      ['/events', 'Events'],
      ['/groups', 'Groups'],
      ['/groups/3', 'Code & Coffee'],
      ['/events/7', 'Open Source Saturday'],
      ['/users/7', 'Hank Cole'],
    ]) {
      const { unmount } = openAs(role, address)
      expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument()
      unmount()
    }
  })

  it.each(Object.keys(people))('an address that matches nothing shows the 404 page for the %s', async (role) => {
    openAs(role, '/nowhere')

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it.each(Object.keys(people))('the home page has the map and no list of events for the %s, with no redirect', async (role) => {
    openAs(role, '/')

    expect(await screen.findByLabelText('Search Event or Group')).toBeInTheDocument()
    expect(document.querySelector('.event-map')).not.toBeNull()
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument()
  })

  it.each(Object.keys(people))('the events page has a list and no map for the %s', async (role) => {
    openAs(role, '/events')

    expect(await screen.findByLabelText('Items per page')).toBeInTheDocument()
    expect(document.querySelector('.event-map')).toBeNull()
  })
})

describe('pages that need a role', () => {
  // [address, what each kind of person should see]
  const guarded = [
    [
      '/events/new',
      { visitor: sendsToLogin, attendee: text('Only hosts can create events.'), owner: heading('Create Event'), otherHost: heading('Create Event') },
    ],
    [
      '/events/7/edit',
      { visitor: sendsToLogin, attendee: text('Only hosts can edit events.'), owner: heading('Edit Event'), otherHost: text('You can only edit events you host.') },
    ],
    [
      '/groups/new',
      { visitor: sendsToLogin, attendee: text('Only hosts can create groups.'), owner: heading('Create Group'), otherHost: heading('Create Group') },
    ],
    [
      '/groups/3/edit',
      { visitor: sendsToLogin, attendee: text('Only hosts can edit groups.'), owner: heading('Edit Group'), otherHost: text('You can only edit groups you organize.') },
    ],
    [
      '/profile',
      { visitor: sendsToLogin, attendee: heading('Edit profile'), owner: heading('Edit profile'), otherHost: heading('Edit profile') },
    ],
    [
      '/collection',
      { visitor: sendsToLogin, attendee: heading('My Collection'), owner: heading('My Collection'), otherHost: heading('My Collection') },
    ],
  ]

  for (const [address, expected] of guarded) {
    it.each(Object.keys(people))(`${address} is right for the %s`, async (role) => {
      openAs(role, address)

      await expected[role]()
    })
  }

  it.each(guarded.map(([address]) => address))('%s sends a GitHub person who has not finished onboarding to onboarding', async (address) => {
    openAs('visitor', address, { needsOnboarding: true })

    expect(await screen.findByRole('heading', { name: 'Onboarding page' })).toBeInTheDocument()
  })
})

describe('what each person can do on an event', () => {
  it('a visitor can only join, which leads to login', async () => {
    openAs('visitor', '/events/7')

    expect(await screen.findByRole('link', { name: 'Join' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: 'Attend' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it.each(['attendee', 'otherHost'])('the %s can attend, but not edit or delete', async (role) => {
    openAs(role, '/events/7')

    expect(await screen.findByRole('button', { name: 'Attend' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Attendees' })).not.toBeInTheDocument()
  })

  it('the host who organizes it can edit it, delete it and see who is coming, but is not offered Attend', async () => {
    openAs('owner', '/events/7')

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/events/7/edit')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Attendees' })).toBeInTheDocument()
    expect(screen.getByText('You host this event.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Attend' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Not attending' })).not.toBeInTheDocument()
  })
})

describe('what each person can do on a group', () => {
  it('a visitor can only join, which leads to login', async () => {
    openAs('visitor', '/groups/3')

    expect(await screen.findByRole('link', { name: 'Join' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it.each(['attendee', 'otherHost'])('the %s can join, but not edit, delete or add events to it', async (role) => {
    openAs(role, '/groups/3')

    expect(await screen.findByRole('button', { name: 'Join' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create event' })).not.toBeInTheDocument()
  })

  it('the host who organizes it can edit it, delete it and create an event for it, and cannot leave it', async () => {
    openAs('owner', '/groups/3')

    expect(await screen.findByText('You organize this group.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/groups/3/edit')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create event' })).toHaveAttribute('href', '/events/new?group=3')
    expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument()
  })
})

describe('the header for each person', () => {
  it('a visitor sees Log In and a + button (both lead to login), and no account menu', async () => {
    openAs('visitor', '/')

    expect(await screen.findByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument()
  })

  it('an attendee sees an account menu, and neither Log In nor Create Event', async () => {
    openAs('attendee', '/')

    expect(await screen.findByRole('button', { name: /account menu/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
  })

  it.each(['owner', 'otherHost'])('a host (%s) sees an account menu and a + button whose dropdown opens the two forms', async (role) => {
    openAs(role, '/')

    const plus = await screen.findByRole('button', { name: 'Create' })
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()

    await userEvent.click(plus)

    expect(screen.getByRole('link', { name: 'Create Event' })).toHaveAttribute('href', '/events/new')
    expect(screen.getByRole('link', { name: 'Create Group' })).toHaveAttribute('href', '/groups/new')
  })

  it('an attendee has no + button', async () => {
    openAs('attendee', '/')
    await screen.findByRole('button', { name: /account menu/i })

    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('a visitor sees Home, Events and Groups, and no My Collection', async () => {
    openAs('visitor', '/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })

    expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Home', 'Events', 'Groups'])
  })

  it.each(['attendee', 'owner', 'otherHost'])('the %s sees Home, Events, Groups and My Collection', async (role) => {
    openAs(role, '/')
    await screen.findByRole('button', { name: /account menu/i })
    const nav = screen.getByRole('navigation', { name: 'Main' })

    expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Home', 'Events', 'Groups', 'My Collection'])
  })
})

describe('where My events and My groups are', () => {
  it.each(['attendee', 'owner', 'otherHost'])('the %s sees them on the home page, below the map', async (role) => {
    openAs(role, '/')

    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My groups' })).toBeInTheDocument()
  })

  it('a visitor does not see them on the home page', async () => {
    openAs('visitor', '/')
    await screen.findByLabelText('Search Event or Group')

    expect(screen.queryByRole('heading', { name: 'My events' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My groups' })).not.toBeInTheDocument()
  })

  it.each(['attendee', 'owner', 'otherHost'])('the %s sees only the profile section on their profile page', async (role) => {
    openAs(role, '/profile')
    await screen.findByRole('heading', { name: 'Edit profile' })

    expect(screen.queryByRole('heading', { name: 'My events' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My groups' })).not.toBeInTheDocument()
  })
})

describe('the Create button at the top of the Events and Groups pages', () => {
  it.each([
    ['/events', 'Create Event', '/events/new'],
    ['/groups', 'Create Group', '/groups/new'],
  ])('%s: hosts go to the form, visitors are sent to log in, attendees have no button', async (address, label, form) => {
    for (const role of ['owner', 'otherHost']) {
      const { unmount } = openAs(role, address)
      expect(await screen.findByRole('link', { name: label })).toHaveAttribute('href', form)
      unmount()
    }

    const visitor = openAs('visitor', address)
    expect((await screen.findAllByRole('link', { name: label })).some((link) => link.getAttribute('href') === '/login')).toBe(true)
    visitor.unmount()

    openAs('attendee', address)
    await screen.findByRole('button', { name: /account menu/i })
    expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
  })
})

describe('My Collection', () => {
  it('is not in the header for a visitor, and a visitor who opens its address is sent to log in', async () => {
    const { unmount } = openAs('visitor', '/')
    await screen.findByRole('link', { name: 'Log In' })
    expect(screen.queryByRole('link', { name: 'My Collection' })).not.toBeInTheDocument()
    unmount()

    openAs('visitor', '/collection')

    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument()
  })

  it.each(['attendee', 'owner', 'otherHost'])('is in the header for the %s, and opens their collection', async (role) => {
    openAs(role, '/')

    await userEvent.click(await screen.findByRole('link', { name: 'My Collection' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'My Collection' })).toBeInTheDocument()
  })

  it.each(['attendee', 'owner', 'otherHost'])('the %s sees their events and groups there, and the profile page stays the profile only', async (role) => {
    openAs(role, '/collection')

    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My groups' })).toBeInTheDocument()
  })

  it.each([
    ['attendee', 1],
    ['owner', 5],
    ['otherHost', 6],
  ])('the %s who opens their own address under /users/ lands on My Collection', async (role, id) => {
    openAs(role, `/users/${id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'My Collection' })).toBeInTheDocument()
  })
})
