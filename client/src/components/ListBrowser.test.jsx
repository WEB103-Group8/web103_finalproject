// these tests check the shared list page: results in pages, items per page, filters in the address and suggestions
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// replace the services and suggestion lookup with ones the test controls
vi.mock('../services/CategoriesAPI', () => ({ default: { getCategories: vi.fn() } }))
vi.mock('../services/CitiesAPI', () => ({ default: { getCities: vi.fn() } }))
vi.mock('../utils/suggestions', () => ({ loadSearchSuggestions: vi.fn() }))

const { default: CategoriesAPI } = await import('../services/CategoriesAPI')
const { default: CitiesAPI } = await import('../services/CitiesAPI')
const { loadSearchSuggestions } = await import('../utils/suggestions')
const { default: ListBrowser } = await import('./ListBrowser')

// 30 pretend things to list, named "Thing 1" to "Thing 30"
const things = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, name: `Thing ${index + 1}` }))

// shows the current address so a test can read it
const ShowAddress = () => <p data-testid="address">{useLocation().search}</p>

// draw the list page at an address
const renderBrowser = (loadItems, address = '/things', props = {}) =>
  render(
    <MemoryRouter initialEntries={[address]}>
      <ListBrowser loadItems={loadItems} renderItem={(thing) => <p>{thing.name}</p>} getKey={(thing) => thing.id} noun="thing" {...props} />
      <ShowAddress />
    </MemoryRouter>,
  )

beforeEach(() => {
  CategoriesAPI.getCategories.mockReset()
  CitiesAPI.getCities.mockReset()
  loadSearchSuggestions.mockReset()
  CategoriesAPI.getCategories.mockResolvedValue(['Food'])
  CitiesAPI.getCities.mockResolvedValue([{ city: 'Austin', state: 'TX', zipcode: '78701' }])
  loadSearchSuggestions.mockResolvedValue([])
})

describe('ListBrowser pages', () => {
  it('shows the first page only, with a count of everything', async () => {
    renderBrowser(vi.fn().mockResolvedValue(things))

    expect(await screen.findByText('Thing 1')).toBeInTheDocument()
    expect(screen.getByText('Thing 10')).toBeInTheDocument()
    expect(screen.queryByText('Thing 11')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1-10 of 30 things')).toBeInTheDocument()
  })

  it('moves to the next page and keeps the page in the address', async () => {
    renderBrowser(vi.fn().mockResolvedValue(things))
    await screen.findByText('Thing 1')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Thing 11')).toBeInTheDocument()
    expect(screen.queryByText('Thing 1')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 11-20 of 30 things')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('?page=2')
  })

  it('opens at the page named in the address', async () => {
    renderBrowser(vi.fn().mockResolvedValue(things), '/things?page=3')

    expect(await screen.findByText('Thing 21')).toBeInTheDocument()
    expect(screen.getByText('Showing 21-30 of 30 things')).toBeInTheDocument()
  })

  it('shows more items per page when the person picks a bigger size, starting again from page 1', async () => {
    renderBrowser(vi.fn().mockResolvedValue(things), '/things?page=2')
    await screen.findByText('Thing 11')

    await userEvent.selectOptions(screen.getByLabelText('Items per page'), '20')

    expect(screen.getByText('Thing 1')).toBeInTheDocument()
    expect(screen.getByText('Thing 20')).toBeInTheDocument()
    expect(screen.queryByText('Thing 21')).not.toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('?perPage=20')
  })

  it('shows no page buttons and a short count when everything fits on one page', async () => {
    renderBrowser(vi.fn().mockResolvedValue(things.slice(0, 3)))

    expect(await screen.findByText('Showing 3 things')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('says "1 thing" for a single result', async () => {
    renderBrowser(vi.fn().mockResolvedValue(things.slice(0, 1)))

    expect(await screen.findByText('Showing 1 thing')).toBeInTheDocument()
  })
})

describe('ListBrowser filters', () => {
  it('loads with the filters from the address, including the zip code', async () => {
    const load = vi.fn().mockResolvedValue(things)
    renderBrowser(load, '/things?city=Austin&zipcode=78701&page=2&perPage=20')
    await screen.findByText('Thing 21')

    expect(load).toHaveBeenCalledWith({ city: 'Austin', zipcode: '78701' })
    expect(screen.getByLabelText('City')).toHaveValue('Austin')
    expect(screen.getByLabelText('Zip Code')).toHaveValue('78701')
  })

  it('applies filters, returns to page 1 and keeps them in the address', async () => {
    const load = vi.fn().mockResolvedValue(things)
    renderBrowser(load, '/things?page=2')
    await screen.findByText('Thing 11')

    load.mockResolvedValue(things.slice(0, 2))
    await userEvent.type(screen.getByLabelText('City'), 'Dallas')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Showing 2 things')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('?city=Dallas')
    expect(load).toHaveBeenLastCalledWith({ city: 'Dallas' })
  })

  it('says so when nothing matches', async () => {
    renderBrowser(vi.fn().mockResolvedValue([]), '/things?q=zzz')

    expect(await screen.findByText('No things match your filters')).toBeInTheDocument()
  })

  it('shows an error with a retry that loads the list again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Could not reach the server.')).mockResolvedValueOnce(things)
    renderBrowser(load)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Thing 1')).toBeInTheDocument()
  })

  it('still works when the categories and cities cannot be loaded', async () => {
    CategoriesAPI.getCategories.mockRejectedValue(new Error('down'))
    CitiesAPI.getCities.mockRejectedValue(new Error('down'))
    renderBrowser(vi.fn().mockResolvedValue(things))

    expect(await screen.findByText('Thing 1')).toBeInTheDocument()
  })
})

describe('ListBrowser with upcoming events by default', () => {
  it('starts with Upcoming only switched on and keeps the address clean', async () => {
    const load = vi.fn().mockResolvedValue(things)
    renderBrowser(load, '/things', { upcomingByDefault: true })
    await screen.findByText('Thing 1')

    expect(load).toHaveBeenCalledWith({ upcoming: 'true' })
    expect(screen.getByLabelText('Upcoming only')).toBeChecked()
    expect(screen.getByTestId('address')).toHaveTextContent('')
  })

  it('remembers in the address when the person switches it off', async () => {
    const load = vi.fn().mockResolvedValue(things)
    renderBrowser(load, '/things', { upcomingByDefault: true })
    await screen.findByText('Thing 1')

    await userEvent.click(screen.getByLabelText('Upcoming only'))
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(load).toHaveBeenLastCalledWith({}))
    expect(screen.getByTestId('address')).toHaveTextContent('?upcoming=false')
    expect(screen.getByLabelText('Upcoming only')).not.toBeChecked()
  })

  it('goes back to upcoming only when the filters are cleared', async () => {
    const load = vi.fn().mockResolvedValue(things)
    renderBrowser(load, '/things?upcoming=false&city=Austin', { upcomingByDefault: true })
    await screen.findByText('Thing 1')

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ upcoming: 'true' }))
    expect(screen.getByLabelText('Upcoming only')).toBeChecked()
  })

  it('does not switch Upcoming only on for pages that do not ask for it', async () => {
    const load = vi.fn().mockResolvedValue(things)
    renderBrowser(load, '/things')
    await screen.findByText('Thing 1')

    expect(load).toHaveBeenCalledWith({})
    expect(screen.getByLabelText('Upcoming only')).not.toBeChecked()
  })
})

describe('ListBrowser suggestions', () => {
  it('suggests names a moment after the person types, and never for a single letter', async () => {
    loadSearchSuggestions.mockResolvedValue(['Jazz Night'])
    renderBrowser(vi.fn().mockResolvedValue(things))
    await screen.findByText('Thing 1')

    await userEvent.type(screen.getByLabelText('Search Event or Group'), 'j')
    expect(loadSearchSuggestions).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Search Event or Group'), 'az')

    await waitFor(() => expect(loadSearchSuggestions).toHaveBeenCalledWith('jaz'))
    await waitFor(() => expect(within(document.body).getAllByRole('option', { hidden: true }).map((option) => option.value)).toContain('Jazz Night'))
  })
})
