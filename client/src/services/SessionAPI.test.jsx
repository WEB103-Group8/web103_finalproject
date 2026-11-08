// these tests check how the app learns who is logged in (no network needed)
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../utils/request'

// replace the real request helper with one the test controls
vi.mock('../utils/request', async (importOriginal) => ({ ...(await importOriginal()), request: vi.fn() }))

const { request } = await import('../utils/request')
const { default: SessionAPI } = await import('./SessionAPI')

describe('getSession', () => {
  it('returns the logged-in person', async () => {
    request.mockResolvedValue({ user_id: 2, is_host: true })

    expect(await SessionAPI.getSession()).toEqual({ user: { user_id: 2, is_host: true }, needsOnboarding: false })
    expect(request).toHaveBeenCalledWith('/api/users/me')
  })

  it('returns nobody for a visitor who is not logged in', async () => {
    request.mockRejectedValue(new ApiError(401, 'Please log in or sign up first.', {}, { needsOnboarding: false }))

    expect(await SessionAPI.getSession()).toEqual({ user: null, needsOnboarding: false })
  })

  it('says when a GitHub user still has to finish onboarding', async () => {
    request.mockRejectedValue(new ApiError(401, 'Please log in or sign up first.', {}, { needsOnboarding: true }))

    expect(await SessionAPI.getSession()).toEqual({ user: null, needsOnboarding: true })
  })

  it('passes on any other failure, such as the server being down', async () => {
    request.mockRejectedValue(new ApiError(0, 'Could not reach the server.'))

    await expect(SessionAPI.getSession()).rejects.toMatchObject({ status: 0 })
  })
})

describe('logout', () => {
  it('calls the existing logout route', async () => {
    request.mockResolvedValue({ message: 'Logged out' })

    await SessionAPI.logout()

    expect(request).toHaveBeenCalledWith('/auth/logout')
  })
})
