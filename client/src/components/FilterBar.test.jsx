// these tests check the filter bar: field order, suggestions, free text, paging size and the buttons
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FilterBar from './FilterBar'

const cities = [
  { city: 'Austin', state: 'TX', zipcode: '78701' },
  { city: 'Dallas', state: 'TX', zipcode: '75201' },
  { city: 'Denver', state: 'CO', zipcode: '80202' },
]

// draw the bar with sensible defaults that a test can override
const renderBar = (props = {}) => {
  const handlers = { onApply: vi.fn(), onClear: vi.fn(), onSearchTyping: vi.fn(), onPerPageChange: vi.fn() }
  render(<FilterBar filters={{}} categories={['Food', 'Technology']} cities={cities} suggestions={[]} perPage={10} {...handlers} {...props} />)
  return handlers
}

// the words offered in a suggestion list
const optionsOf = (id) => [...document.querySelectorAll(`#${id} option`)].map((option) => option.value)

describe('FilterBar fields', () => {
  it('puts City before State and uses the new labels', () => {
    renderBar()
    const city = screen.getByLabelText('City')
    const state = screen.getByLabelText('State')

    expect(city.compareDocumentPosition(state) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('Search Event or Group')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.queryByLabelText('Interest')).not.toBeInTheDocument()
  })

  it('starts with the filters it was given', () => {
    renderBar({ filters: { q: 'jazz', state: 'TX' } })

    expect(screen.getByLabelText('Search Event or Group')).toHaveValue('jazz')
    expect(screen.getByLabelText('State')).toHaveValue('TX')
  })

  it('puts City, State and Zip Code in that order, and always shows every field', () => {
    renderBar()
    const order = ['City', 'State', 'Zip Code', 'Category'].map((label) => screen.getByLabelText(label))

    order.slice(1).forEach((field, index) => expect(order[index].compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy())
    for (const label of ['Search Event or Group', 'From', 'To', 'Upcoming only', 'Items per page']) expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('keeps Upcoming only and Items per page together on one line', () => {
    renderBar()
    const line = screen.getByLabelText('Upcoming only').closest('.filter-inline')

    expect(line).toContainElement(screen.getByLabelText('Items per page'))
  })
})

describe('FilterBar suggestions', () => {
  it('offers the suggestions it was given for the search box, and reports what is typed', async () => {
    const { onSearchTyping } = renderBar({ suggestions: ['Jazz Night', 'Jazz Club'] })

    await userEvent.type(screen.getByLabelText('Search Event or Group'), 'jaz')

    expect(optionsOf('filter-q-options')).toEqual(['Jazz Night', 'Jazz Club'])
    expect(onSearchTyping).toHaveBeenLastCalledWith('jaz')
  })

  it('offers each city and state once, and the categories', () => {
    renderBar()

    expect(optionsOf('filter-city-options')).toEqual(['Austin', 'Dallas', 'Denver'])
    expect(optionsOf('filter-state-options')).toEqual(['CO', 'TX'])
    expect(optionsOf('filter-category-options')).toEqual(['Food', 'Technology'])
  })

  it('only suggests the cities of the state that was typed', async () => {
    renderBar()

    await userEvent.type(screen.getByLabelText('State'), 'tx')

    expect(optionsOf('filter-city-options')).toEqual(['Austin', 'Dallas'])
  })

  it('suggests zip codes, narrowed by the state and city that were typed', async () => {
    renderBar()
    expect(optionsOf('filter-zipcode-options')).toEqual(['75201', '78701', '80202'])

    await userEvent.type(screen.getByLabelText('State'), 'TX')
    expect(optionsOf('filter-zipcode-options')).toEqual(['75201', '78701'])

    await userEvent.type(screen.getByLabelText('City'), 'Dallas')
    expect(optionsOf('filter-zipcode-options')).toEqual(['75201'])
  })
})

describe('FilterBar buttons', () => {
  it('applies whatever was typed, even text that matches no suggestion, only when the person searches', async () => {
    const { onApply } = renderBar()

    await userEvent.type(screen.getByLabelText('Search Event or Group'), 'something odd')
    await userEvent.type(screen.getByLabelText('City'), 'Smallville')
    await userEvent.type(screen.getByLabelText('Zip Code'), '00000')
    await userEvent.type(screen.getByLabelText('Category'), 'Basket weaving')
    await userEvent.click(screen.getByLabelText('Upcoming only'))
    expect(onApply).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ q: 'something odd', city: 'Smallville', category: 'Basket weaving', zipcode: '00000', upcoming: 'true' }))
  })

  it('clears the fields back to the filters the page starts with', async () => {
    const { onClear } = renderBar({ filters: { q: 'jazz' }, defaultFilters: { upcoming: 'true' } })

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('Search Event or Group')).toHaveValue('')
    expect(screen.getByLabelText('Upcoming only')).toBeChecked()
  })
})

describe('FilterBar without the page size', () => {
  it('leaves out Items per page when asked, and keeps everything else', () => {
    renderBar({ showPerPage: false })

    expect(screen.queryByLabelText('Items per page')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Upcoming only')).toBeInTheDocument()
  })
})

describe('FilterBar items per page', () => {
  it('shows the current size and reports a new one straight away', async () => {
    const { onPerPageChange } = renderBar({ perPage: 20 })

    expect(screen.getByLabelText('Items per page')).toHaveValue('20')

    await userEvent.selectOptions(screen.getByLabelText('Items per page'), '50')

    expect(onPerPageChange).toHaveBeenCalledWith(50)
  })
})
