// these tests check who may open a guarded page: visitors, attendees and hosts
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SessionContext } from '../context/SessionContext'
import RequireRole from './RequireRole'

const attendee = { user_id: 1, is_host: false }
const host = { user_id: 2, is_host: true }

// draw a guarded page for the given session, with pretend login and onboarding pages
const renderGuarded = (session, role) =>
  render(
    <SessionContext.Provider value={{ loading: false, needsOnboarding: false, user: null, ...session }}>
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/onboarding" element={<p>onboarding page</p>} />
          <Route
            path="/events/new"
            element={
              <RequireRole role={role} blockedMessage="Only hosts can create events.">
                <p>secret page</p>
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>,
  )

describe('RequireRole', () => {
  it('waits while the app is still finding out who is logged in', () => {
    renderGuarded({ loading: true }, 'user')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })

  it('sends a visitor who is not logged in to the login page', () => {
    renderGuarded({}, 'user')

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('sends a GitHub user who has not finished onboarding to onboarding', () => {
    renderGuarded({ needsOnboarding: true }, 'user')

    expect(screen.getByText('onboarding page')).toBeInTheDocument()
  })

  it('lets any logged-in person open a page that needs a login', () => {
    renderGuarded({ user: attendee }, 'user')

    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('blocks an attendee from a host-only page with a friendly message and a way back', () => {
    renderGuarded({ user: attendee }, 'host')

    expect(screen.getByText('Only hosts can create events.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/')
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })

  it('lets a host open a host-only page', () => {
    renderGuarded({ user: host }, 'host')

    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('sends a visitor to login even for a host-only page', () => {
    renderGuarded({}, 'host')

    expect(screen.getByText('login page')).toBeInTheDocument()
  })
})
