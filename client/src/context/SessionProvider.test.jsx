// these tests check that signing out from Orbit also signs out of the login pages, so the two never disagree about who is logged in
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// replace the session service with one the test controls
vi.mock('../services/SessionAPI', () => ({ default: { getSession: vi.fn(), logout: vi.fn() } }))

const { default: SessionAPI } = await import('../services/SessionAPI')
const { AuthProvider, useAuth } = await import('./AuthContext')
const { useSession } = await import('./SessionContext')
const { default: SessionProvider } = await import('./SessionProvider')

const person = { user_id: 5, full_name: 'Hank Cole', is_host: true }

// shows both copies of "who is logged in", and a button that signs out through Orbit
const Probe = () => {
  const { user, signOut } = useSession()
  const login = useAuth()

  return (
    <>
      <p>{`orbit: ${user ? user.full_name : 'nobody'}`}</p>
      <p>{`login pages: ${login ? (login.user ? login.user.full_name : 'nobody') : 'not there'}`}</p>
      <button type="button" onClick={signOut}>
        sign out
      </button>
    </>
  )
}

beforeEach(() => {
  SessionAPI.getSession.mockReset()
  SessionAPI.logout.mockReset()
  SessionAPI.getSession.mockResolvedValue({ user: person, needsOnboarding: false })
  SessionAPI.logout.mockResolvedValue({ message: 'Logged out' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SessionProvider signing out', () => {
  it('also clears the login pages\' own copy of the logged-in person', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...person, is_onboarded: true }) }))
    render(
      <AuthProvider>
        <SessionProvider>
          <Probe />
        </SessionProvider>
      </AuthProvider>,
    )
    expect(await screen.findByText('orbit: Hank Cole')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('login pages: Hank Cole')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))

    expect(await screen.findByText('orbit: nobody')).toBeInTheDocument()
    expect(screen.getByText('login pages: nobody')).toBeInTheDocument()
    expect(SessionAPI.logout).toHaveBeenCalledOnce()
  })

  it('still signs out when the login context is not present', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(await screen.findByText('orbit: Hank Cole')).toBeInTheDocument()
    expect(screen.getByText('login pages: not there')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))

    expect(await screen.findByText('orbit: nobody')).toBeInTheDocument()
  })
})
