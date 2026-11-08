// these tests check which links the header shows to visitors, attendees and hosts
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SessionContext } from '../context/SessionContext'
import OrbitHeader from './OrbitHeader'

const attendee = { user_id: 1, full_name: 'Ana Lee', is_host: false }
const host = { user_id: 2, full_name: 'Hank Cole', is_host: true }

// draw the header for the given session
const renderHeader = (user, signOut = vi.fn().mockResolvedValue()) => {
  render(
    <SessionContext.Provider value={{ user, needsOnboarding: false, loading: false, signOut }}>
      <MemoryRouter>
        <OrbitHeader />
      </MemoryRouter>
    </SessionContext.Provider>,
  )
  return signOut
}

describe('OrbitHeader for a visitor', () => {
  it('shows browse links, and sends Log In and the + button to login', () => {
    renderHeader(null)

    expect(screen.getByRole('link', { name: /orbit/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('link', { name: 'Groups' })).toHaveAttribute('href', '/groups')
    expect(screen.queryByRole('link', { name: 'My Collection' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: /sign/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Create' })).toHaveTextContent('+')
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument()
  })
})

describe('OrbitHeader for an attendee', () => {
  it('shows home, an account menu, and no host buttons', async () => {
    renderHeader(attendee)

    expect(screen.getByRole('link', { name: /orbit/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'My Collection' })).toHaveAttribute('href', '/collection')
    expect(screen.queryByRole('link', { name: 'Log In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Group' })).not.toBeInTheDocument()
  })

  it('signs out when the person chooses Sign out', async () => {
    const signOut = renderHeader(attendee)

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledOnce()
  })
})

describe('OrbitHeader for a host', () => {
  it('has a + button instead of a Create Event button', () => {
    renderHeader(host)

    expect(screen.getByRole('button', { name: 'Create' })).toHaveTextContent('+')
    expect(screen.getByRole('link', { name: 'My Collection' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Group' })).not.toBeInTheDocument()
  })

  it('opens a dropdown with Create Event and Create Group when the + button is clicked', async () => {
    renderHeader(host)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('link', { name: 'Create Event' })).toHaveAttribute('href', '/events/new')
    expect(screen.getByRole('link', { name: 'Create Group' })).toHaveAttribute('href', '/groups/new')
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('no longer has Create Group in the account menu', async () => {
    renderHeader(host)

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Group' })).not.toBeInTheDocument()
  })

  it('closes the + dropdown when the + button is clicked again', async () => {
    renderHeader(host)
    const plus = screen.getByRole('button', { name: 'Create' })

    await userEvent.click(plus)
    await userEvent.click(plus)

    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
  })

  it('closes the + dropdown after a choice is made', async () => {
    renderHeader(host)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await userEvent.click(screen.getByRole('link', { name: 'Create Group' }))

    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
  })
})

describe('OrbitHeader dropdowns close when the person clicks elsewhere', () => {
  it('closes the account menu on a click anywhere else on the page', async () => {
    renderHeader(attendee)
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()

    await userEvent.click(document.body)

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the account menu when another part of the header is clicked', async () => {
    renderHeader(attendee)
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    await userEvent.click(screen.getByRole('link', { name: 'Events' }))

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('keeps the account menu open while its own links are clicked inside it, until the link is used', async () => {
    renderHeader(attendee)
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    await userEvent.click(screen.getByRole('link', { name: 'My Profile' }))

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('closes the + dropdown on a click anywhere else on the page', async () => {
    renderHeader(host)
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('link', { name: 'Create Event' })).toBeInTheDocument()

    await userEvent.click(document.body)

    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
  })

  it('closes a dropdown when Escape is pressed', async () => {
    renderHeader(attendee)
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('has only one dropdown open at a time', async () => {
    renderHeader(host)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
  })
})

describe('OrbitHeader while the app finds out who is logged in', () => {
  it('shows the links but none of the visitor or account buttons yet', () => {
    render(
      <SessionContext.Provider value={{ user: null, needsOnboarding: false, loading: true, signOut: vi.fn() }}>
        <MemoryRouter>
          <OrbitHeader />
        </MemoryRouter>
      </SessionContext.Provider>,
    )

    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument()
  })
})
