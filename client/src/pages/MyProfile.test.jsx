// these tests check your own profile page: your private details, the form to change them, and the prompt to finish a new profile
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionContext } from '../context/SessionContext'
import { ToastContext } from '../context/ToastContext'
import { ApiError } from '../utils/request'

// replace the services with ones the test controls
vi.mock('../services/UsersAPI', () => ({ default: { getUser: vi.fn(), getUserEvents: vi.fn(), getUserGroups: vi.fn(), updateMe: vi.fn() } }))
vi.mock('../services/CitiesAPI', () => ({ default: { getCities: vi.fn() } }))

const { default: UsersAPI } = await import('../services/UsersAPI')
const { default: CitiesAPI } = await import('../services/CitiesAPI')
const { default: MyProfile } = await import('./MyProfile')

const complete = { user_id: 5, full_name: 'Ana Lee', email: 'ana@example.com', city: 'Austin', state: 'TX', country: 'USA', zipcode: '78701', user_image_url: null }
const refresh = vi.fn()
const notify = vi.fn()

const renderMine = () =>
  render(
    <ToastContext.Provider value={{ notify }}>
      <SessionContext.Provider value={{ user: { user_id: 5, is_host: false }, needsOnboarding: false, loading: false, signOut: vi.fn(), refresh }}>
        <MemoryRouter>
          <MyProfile />
        </MemoryRouter>
      </SessionContext.Provider>
    </ToastContext.Provider>,
  )

beforeEach(() => {
  for (const service of [UsersAPI, CitiesAPI]) for (const fn of Object.values(service)) fn.mockReset()
  refresh.mockReset()
  notify.mockReset()
  UsersAPI.getUser.mockResolvedValue(complete)
  UsersAPI.getUserEvents.mockResolvedValue([])
  UsersAPI.getUserGroups.mockResolvedValue([])
  UsersAPI.updateMe.mockResolvedValue({ ...complete, full_name: 'Ana Maria Lee' })
  CitiesAPI.getCities.mockResolvedValue([
    { city: 'Austin', state: 'TX', zipcode: '78701' },
    { city: 'Dallas', state: 'TX', zipcode: '75201' },
    { city: 'Denver', state: 'CO', zipcode: '80202' },
  ])
})

describe('MyProfile', () => {
  it('shows your own details, email included, and asks the server for your own page', async () => {
    renderMine()

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Lee' })).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Austin, TX, 78701, USA')).toBeInTheDocument()
    expect(UsersAPI.getUser).toHaveBeenCalledWith(5)
  })

  it('fills the form with your details and suggests the states that have events', async () => {
    renderMine()

    expect(await screen.findByLabelText('Full name')).toHaveValue('Ana Lee')
    expect(screen.getByLabelText('City')).toHaveValue('Austin')
    expect(screen.getByLabelText('ZIP code')).toHaveValue('78701')
    expect([...document.querySelectorAll('#profile-state-options option')].map((option) => option.value)).toEqual(['CO', 'TX'])
  })

  it('shows the profile section only: no events and no groups', async () => {
    renderMine()
    await screen.findByLabelText('Full name')

    expect(screen.queryByRole('heading', { name: 'My events' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My groups' })).not.toBeInTheDocument()
    expect(UsersAPI.getUserEvents).not.toHaveBeenCalled()
    expect(UsersAPI.getUserGroups).not.toHaveBeenCalled()
  })

  it('does not ask a complete profile to be completed', async () => {
    renderMine()
    await screen.findByLabelText('Full name')

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('asks a new GitHub person to add their state, country and ZIP code', async () => {
    UsersAPI.getUser.mockResolvedValue({ ...complete, state: null, country: null, zipcode: null })
    renderMine()

    expect(await screen.findByRole('note')).toHaveTextContent('Complete your profile')
  })

  it('saves the changes, shows the new name, shows a pop-up, and refreshes the session so the header changes too', async () => {
    renderMine()
    const name = await screen.findByLabelText('Full name')

    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Maria Lee')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(UsersAPI.updateMe).toHaveBeenCalledWith({ full_name: 'Ana Maria Lee', city: 'Austin', state: 'TX', country: 'USA', zipcode: '78701', user_image_url: '' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Maria Lee' })).toBeInTheDocument()
    expect(notify).toHaveBeenCalledWith('Profile saved.')
    expect(refresh).toHaveBeenCalled()
  })

  it('does not let the name or the city be emptied', async () => {
    renderMine()

    await userEvent.clear(await screen.findByLabelText('Full name'))
    await userEvent.clear(screen.getByLabelText('City'))
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('City is required.')).toBeInTheDocument()
    expect(UsersAPI.updateMe).not.toHaveBeenCalled()
  })

  it('shows what the server did not accept next to the field', async () => {
    UsersAPI.updateMe.mockRejectedValue(new ApiError(400, 'Please fix the highlighted fields.', { zipcode: 'ZIP code must be five digits.' }))
    renderMine()
    const zip = await screen.findByLabelText('ZIP code')

    await userEvent.clear(zip)
    await userEvent.type(zip, '12')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('ZIP code must be five digits.')).toBeInTheDocument()
    expect(notify).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('shows an error with a retry when the profile cannot be loaded', async () => {
    UsersAPI.getUser.mockRejectedValueOnce(new Error('Could not reach the server.')).mockResolvedValueOnce(complete)
    renderMine()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Lee' })).toBeInTheDocument()
  })
})
