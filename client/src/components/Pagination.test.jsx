// these tests check the page buttons under a long list
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('shows nothing when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('marks the current page and moves with Previous, Next and the numbers', async () => {
    const change = vi.fn()
    render(<Pagination page={2} totalPages={3} onPageChange={change} />)

    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current')

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(change.mock.calls).toEqual([[1], [3], [3]])
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    rerender(<Pagination page={3} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('shortens a long list of pages with dots around the current page', () => {
    render(<Pagination page={10} totalPages={20} onPageChange={() => {}} />)

    const numbers = screen.getAllByRole('button', { name: /^Page/ }).map((button) => button.textContent)

    expect(numbers).toEqual(['1', '9', '10', '11', '20'])
  })
})
