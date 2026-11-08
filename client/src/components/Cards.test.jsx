// these tests check what the event and group cards show and where they link
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import EventCard from './EventCard'
import GroupCard from './GroupCard'

const event = {
  event_id: 7,
  event_title: 'Open Source Saturday',
  group_name: 'Austin Code & Coffee',
  start_time: '2026-11-14T18:30:00',
  end_time: '2026-11-14T20:00:00',
  city: 'Austin',
  state: 'TX',
  rsvp_count: 12,
  event_image_url: 'https://example.com/cover.png',
}

const group = {
  group_id: 3,
  group_name: 'Austin Code & Coffee',
  category: 'Technology',
  member_count: 40,
  group_image_url: 'https://example.com/group.png',
}

describe('EventCard', () => {
  it('shows the title, group, time, place and attendees, and links to the event', () => {
    const { container } = render(
      <MemoryRouter>
        <EventCard event={event} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/7')
    expect(screen.getByRole('heading', { name: 'Open Source Saturday' })).toBeInTheDocument()
    expect(screen.getByText('Austin Code & Coffee')).toBeInTheDocument()
    expect(screen.getByText('Sat, Nov 14 - 6:30 PM to 8:00 PM')).toBeInTheDocument()
    expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    expect(screen.getByText('12 attending')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/cover.png')
  })

  it('shows the time zone of the venue when the event has one', () => {
    render(
      <MemoryRouter>
        <EventCard event={{ ...event, timezone: 'America/Chicago' }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sat, Nov 14 - 6:30 PM to 8:00 PM CST')).toBeInTheDocument()
  })

  it('says Online instead of a city for an event without a venue', () => {
    render(
      <MemoryRouter>
        <EventCard event={{ ...event, venue_id: null, city: null, state: null }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.queryByText('Austin, TX')).not.toBeInTheDocument()
  })

  it('shows a plain block instead of a cover when there is no image', () => {
    const { container } = render(
      <MemoryRouter>
        <EventCard event={{ ...event, event_image_url: null }} />
      </MemoryRouter>,
    )

    expect(container.querySelector('img')).toBeNull()
  })
})

describe('GroupCard', () => {
  it('shows the name, category and member count, and links to the group', () => {
    render(
      <MemoryRouter>
        <GroupCard group={group} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/groups/3')
    expect(screen.getByRole('heading', { name: 'Austin Code & Coffee' })).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('40 members')).toBeInTheDocument()
  })

  it('says "1 member" for a group of one', () => {
    render(
      <MemoryRouter>
        <GroupCard group={{ ...group, member_count: 1 }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('1 member')).toBeInTheDocument()
  })
})
