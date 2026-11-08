// these tests check the small messages the pages show while waiting, on errors and when there is nothing to show
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EmptyState from './EmptyState'
import ErrorMessage from './ErrorMessage'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('shows a spinning wheel, and tells screen readers something is loading', () => {
    const { container } = render(<Spinner />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(container.querySelector('.spinner-wheel')).toBeInTheDocument()
  })
})

describe('ErrorMessage', () => {
  it('shows the message and a working retry button', async () => {
    const retry = vi.fn()
    render(<ErrorMessage message="Could not reach the server." onRetry={retry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(retry).toHaveBeenCalledOnce()
  })

  it('leaves out the retry button when there is nothing to retry', () => {
    render(<ErrorMessage message="Not found." />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('shows a title, a hint and an optional link', () => {
    render(
      <MemoryRouter>
        <EmptyState title="No events yet" message="Join a group to see events here." actionLabel="Find groups" actionTo="/groups" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'No events yet' })).toBeInTheDocument()
    expect(screen.getByText('Join a group to see events here.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find groups' })).toHaveAttribute('href', '/groups')
  })

  it('shows no link when none is given', () => {
    render(<EmptyState title="Nothing here" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
