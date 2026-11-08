// this test checks that a visitor can browse the groups list and open a group
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SessionContext } from '../context/SessionContext'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// replace the services with ones the test controls
vi.mock('../services/GroupsAPI', () => ({ default: { getGroups: vi.fn() } }))
vi.mock('../services/CategoriesAPI', () => ({ default: { getCategories: vi.fn().mockResolvedValue([]) } }))
vi.mock('../services/CitiesAPI', () => ({ default: { getCities: vi.fn().mockResolvedValue([]) } }))

const { default: GroupsAPI } = await import('../services/GroupsAPI')
const { default: GroupsIndex } = await import('./GroupsIndex')

beforeEach(() => {
  GroupsAPI.getGroups.mockReset()
})

describe('GroupsIndex', () => {
  it('lists groups with links to each one, without asking anyone to log in, with the same filter bar as events', async () => {
    GroupsAPI.getGroups.mockResolvedValue([
      { group_id: 3, group_name: 'Code & Coffee', category: 'Technology', member_count: 40 },
      { group_id: 4, group_name: 'Sketch & Sip', category: 'Arts', member_count: 12 },
    ])
    render(
      <MemoryRouter initialEntries={['/groups?state=TX']}>
        <GroupsIndex />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Code & Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Code & Coffee/ })).toHaveAttribute('href', '/groups/3')
    expect(screen.getByRole('link', { name: /Sketch & Sip/ })).toHaveAttribute('href', '/groups/4')
    expect(screen.getByText('Showing 2 groups')).toBeInTheDocument()
    expect(GroupsAPI.getGroups).toHaveBeenCalledWith({ state: 'TX' })
    for (const label of ['Search Event or Group', 'City', 'State', 'Zip Code', 'Category', 'From', 'To', 'Upcoming only', 'Items per page']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })
})

describe('the Create Group button', () => {
  // draw the page for a visitor, or for the person given
  const renderFor = (user) => {
    GroupsAPI.getGroups.mockResolvedValue([{ group_id: 3, group_name: 'Code & Coffee', category: 'Technology', member_count: 40 }])
    render(
      <SessionContext.Provider value={{ user, needsOnboarding: false, loading: false, signOut: vi.fn(), refresh: vi.fn() }}>
        <MemoryRouter initialEntries={['/groups']}>
          <GroupsIndex />
        </MemoryRouter>
      </SessionContext.Provider>,
    )
  }

  it('is at the top, above the filters, for a host, and goes to the form', async () => {
    renderFor({ user_id: 5, is_host: true })

    const button = await screen.findByRole('link', { name: 'Create Group' })
    const filters = screen.getByLabelText('Search Event or Group')

    expect(button).toHaveAttribute('href', '/groups/new')
    expect(button.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sends a visitor to log in', async () => {
    renderFor(null)

    expect(await screen.findByRole('link', { name: 'Create Group' })).toHaveAttribute('href', '/login')
  })

  it('is not shown to an attendee', async () => {
    renderFor({ user_id: 1, is_host: false })
    await screen.findByText('Code & Coffee')

    expect(screen.queryByRole('link', { name: 'Create Group' })).not.toBeInTheDocument()
  })
})
