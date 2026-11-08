// these tests check the events page: cards with the filters and pages, and no map for anyone
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionContext } from '../context/SessionContext'

// replace the services with ones the test controls
vi.mock('../services/EventsAPI', () => ({ default: { getEvents: vi.fn(), getEventPins: vi.fn() } }))
vi.mock('../services/CategoriesAPI', () => ({ default: { getCategories: vi.fn().mockResolvedValue([]) } }))
vi.mock('../services/CitiesAPI', () => ({ default: { getCities: vi.fn().mockResolvedValue([]) } }))

const { default: EventsAPI } = await import('../services/EventsAPI')
const { default: EventsExplorer } = await import('./EventsExplorer')

const events = [
  { event_id: 1, event_title: 'Open Source Saturday', group_name: 'Code & Coffee', start_time: '2027-01-19T20:30:00', end_time: '2027-01-19T22:00:00', city: 'Austin', state: 'TX', rsvp_count: 3 },
  { event_id: 2, event_title: 'Open Studio Evening', group_name: 'Sketch & Sip', start_time: '2027-01-20T18:00:00', end_time: '2027-01-20T19:00:00', city: 'Dallas', state: 'TX', rsvp_count: 8 },
]

// draw the page for a visitor, or for the person given
const renderExplorer = (address = '/events', user = null) =>
  render(
    <SessionContext.Provider value={{ user, needsOnboarding: false, loading: false, signOut: vi.fn(), refresh: vi.fn() }}>
      <MemoryRouter initialEntries={[address]}>
        <EventsExplorer />
      </MemoryRouter>
    </SessionContext.Provider>,
  )

beforeEach(() => {
  EventsAPI.getEvents.mockReset()
  EventsAPI.getEventPins.mockReset()
  EventsAPI.getEvents.mockResolvedValue(events)
})

describe('EventsExplorer', () => {
  it('lists events that link to their pages, with the filters and the page size', async () => {
    renderExplorer('/events?state=TX&q=jazz')

    expect(await screen.findByText('Open Source Saturday')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Source Saturday/ })).toHaveAttribute('href', '/events/1')
    expect(EventsAPI.getEvents).toHaveBeenCalledWith({ state: 'TX', q: 'jazz' })
    expect(screen.getByLabelText('Upcoming only')).toBeInTheDocument()
    expect(screen.getByLabelText('Items per page')).toBeInTheDocument()
  })

  it('has no map for a visitor', async () => {
    renderExplorer('/events', null)
    await screen.findByText('Open Source Saturday')

    expect(document.querySelector('.event-map')).toBeNull()
    expect(EventsAPI.getEventPins).not.toHaveBeenCalled()
  })

  it('has no map for a logged-in person either', async () => {
    renderExplorer('/events', { user_id: 1, is_host: false })

    expect(await screen.findByText('Open Source Saturday')).toBeInTheDocument()
    expect(document.querySelector('.event-map')).toBeNull()
    expect(EventsAPI.getEventPins).not.toHaveBeenCalled()
  })
})

describe('the Create Event button', () => {
  it('is at the top, above the filters, for a host, and goes to the form', async () => {
    renderExplorer('/events', { user_id: 5, is_host: true })

    const button = await screen.findByRole('link', { name: 'Create Event' })
    const filters = screen.getByLabelText('Search Event or Group')

    expect(button).toHaveAttribute('href', '/events/new')
    expect(button.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sends a visitor to log in', async () => {
    renderExplorer('/events', null)

    expect(await screen.findByRole('link', { name: 'Create Event' })).toHaveAttribute('href', '/login')
  })

  it('is not shown to an attendee', async () => {
    renderExplorer('/events', { user_id: 1, is_host: false })
    await screen.findByText('Open Source Saturday')

    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
  })
})
