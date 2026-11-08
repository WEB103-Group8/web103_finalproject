// these tests check creating and editing a group as a host: the form, what is sent, and who may use it
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionContext } from '../context/SessionContext'
import { ToastContext } from '../context/ToastContext'
import { ApiError } from '../utils/request'

// replace the services with ones the test controls
vi.mock('../services/GroupsAPI', () => ({ default: { getGroup: vi.fn(), createGroup: vi.fn(), updateGroup: vi.fn() } }))
vi.mock('../services/CategoriesAPI', () => ({ default: { getCategories: vi.fn() } }))

const { default: GroupsAPI } = await import('../services/GroupsAPI')
const { default: CategoriesAPI } = await import('../services/CategoriesAPI')
const { default: GroupCreate } = await import('./GroupCreate')
const { default: GroupEdit } = await import('./GroupEdit')

const host = { user_id: 5, is_host: true }

// the pop-up messages the pages ask for
const notify = vi.fn()

// draw a page for a person, with a pretend group page to land on
const renderAt = (address, user = host, history = [address]) =>
  render(
    <ToastContext.Provider value={{ notify }}>
      <SessionContext.Provider value={{ user, needsOnboarding: false, loading: false, signOut: vi.fn() }}>
        <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
          <Routes>
            <Route path="/groups/new" element={<GroupCreate />} />
            <Route path="/groups/:groupId/edit" element={<GroupEdit />} />
            <Route path="/groups/:groupId" element={<p>group page</p>} />
            <Route path="/groups" element={<p>groups list page</p>} />
          </Routes>
        </MemoryRouter>
      </SessionContext.Provider>
    </ToastContext.Provider>,
  )

beforeEach(() => {
  notify.mockReset()
  for (const service of [GroupsAPI, CategoriesAPI]) for (const fn of Object.values(service)) fn.mockReset()
  CategoriesAPI.getCategories.mockResolvedValue(['Food', 'Technology'])
})

describe('GroupCreate', () => {
  it('offers the categories from the server in a dropdown that narrows as the host types', async () => {
    renderAt('/groups/new')

    await userEvent.click(await screen.findByLabelText('Category'))
    expect(within(screen.getByRole('list', { name: 'Category results' })).getAllByRole('button').map((button) => button.textContent)).toEqual(['Food', 'Technology', '+ Add New Category'])

    await userEvent.type(screen.getByLabelText('Category'), 'tech')
    expect(screen.queryByRole('button', { name: 'Food' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument()
  })

  it('lets the host type a brand-new category, and sends that word', async () => {
    GroupsAPI.createGroup.mockResolvedValue({ group_id: 12 })
    renderAt('/groups/new')

    await userEvent.type(await screen.findByLabelText('Name'), 'Chess Club')
    await userEvent.type(screen.getByLabelText('Category'), 'Board Games')
    expect(screen.getByText('"Board Games" is a new category and will be added.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create Group' }))

    expect(GroupsAPI.createGroup).toHaveBeenCalledWith(expect.objectContaining({ group_name: 'Chess Club', category: 'Board Games' }))
  })

  it('does not call an existing category new, and fills the box when one is picked', async () => {
    renderAt('/groups/new')

    await userEvent.type(await screen.findByLabelText('Category'), 'tech')
    await userEvent.click(screen.getByRole('button', { name: 'Technology' }))

    expect(screen.getByLabelText('Category')).toHaveValue('Technology')
    expect(screen.queryByText(/is a new category/)).not.toBeInTheDocument()
  })

  it('names the missing fields and sends nothing', async () => {
    renderAt('/groups/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Create Group' }))

    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(GroupsAPI.createGroup).not.toHaveBeenCalled()
  })

  it('creates the group, then shows it', async () => {
    GroupsAPI.createGroup.mockResolvedValue({ group_id: 12 })
    renderAt('/groups/new')

    await userEvent.type(await screen.findByLabelText('Name'), ' Code & Coffee ')
    await userEvent.type(screen.getByLabelText('Category'), 'Technology')
    await userEvent.type(screen.getByLabelText('Description (optional)'), 'A friendly meetup.')
    await userEvent.click(screen.getByRole('button', { name: 'Create Group' }))

    expect(GroupsAPI.createGroup).toHaveBeenCalledWith({ group_name: 'Code & Coffee', category: 'Technology', description: 'A friendly meetup.', group_image_url: '' })
    expect(await screen.findByText('group page')).toBeInTheDocument()
  })

  it('shows what the server did not accept next to the field', async () => {
    GroupsAPI.createGroup.mockRejectedValue(new ApiError(400, 'Please fix the highlighted fields.', { group_image_url: 'Image must be a web address starting with http:// or https://.' }))
    renderAt('/groups/new')

    await userEvent.type(await screen.findByLabelText('Name'), 'Code')
    await userEvent.type(screen.getByLabelText('Category'), 'Food')
    await userEvent.type(screen.getByLabelText('Cover image URL (optional)'), 'nonsense')
    await userEvent.click(screen.getByRole('button', { name: 'Create Group' }))

    expect(await screen.findByText('Image must be a web address starting with http:// or https://.')).toBeInTheDocument()
  })

  it('shows an error with a retry when the categories cannot be loaded', async () => {
    CategoriesAPI.getCategories.mockRejectedValueOnce(new Error('Could not reach the server.')).mockResolvedValueOnce(['Food'])
    renderAt('/groups/new')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByLabelText('Name')).toBeInTheDocument()
  })
})

describe('GroupEdit', () => {
  const group = { group_id: 3, organizer_id: 5, group_name: 'Code & Coffee', category: 'Technology', description: 'A friendly meetup.', group_image_url: null }

  beforeEach(() => {
    GroupsAPI.getGroup.mockResolvedValue(group)
    GroupsAPI.updateGroup.mockResolvedValue({})
  })

  it('fills the form with the group', async () => {
    renderAt('/groups/3/edit')

    expect(await screen.findByLabelText('Name')).toHaveValue('Code & Coffee')
    expect(screen.getByLabelText('Category')).toHaveValue('Technology')
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('A friendly meetup.')
  })

  it('saves the changes, then shows the group', async () => {
    renderAt('/groups/3/edit')
    const name = await screen.findByLabelText('Name')

    await userEvent.clear(name)
    await userEvent.type(name, 'Coffee Coders')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(GroupsAPI.updateGroup).toHaveBeenCalledWith(3, { group_name: 'Coffee Coders', category: 'Technology', description: 'A friendly meetup.', group_image_url: '' })
    expect(await screen.findByText('group page')).toBeInTheDocument()
  })

  it('blocks a host who does not organize the group', async () => {
    renderAt('/groups/3/edit', { user_id: 6, is_host: true })

    expect(await screen.findByText('You can only edit groups you organize.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})

describe('pop-ups on the group forms', () => {
  it('says the group was created', async () => {
    GroupsAPI.createGroup.mockResolvedValue({ group_id: 12 })
    renderAt('/groups/new')

    await userEvent.type(await screen.findByLabelText('Name'), 'Chess Club')
    await userEvent.type(screen.getByLabelText('Category'), 'Food')
    await userEvent.click(screen.getByRole('button', { name: 'Create Group' }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Group created.'))
  })

  it('says the group was updated', async () => {
    GroupsAPI.getGroup.mockResolvedValue({ group_id: 3, organizer_id: 5, group_name: 'Code & Coffee', category: 'Technology', description: null, group_image_url: null })
    GroupsAPI.updateGroup.mockResolvedValue({})
    renderAt('/groups/3/edit')
    const name = await screen.findByLabelText('Name')

    await userEvent.clear(name)
    await userEvent.type(name, 'Coffee Coders')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Group updated.'))
  })

  it('goes back at once when Cancel is pressed with nothing typed', async () => {
    renderAt('/groups/new', host, ['/groups', '/groups/new'])

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('groups list page')).toBeInTheDocument()
  })

  it('asks "are you sure?" when Cancel is pressed after typing, and goes back only if the person agrees', async () => {
    renderAt('/groups/new', host, ['/groups', '/groups/new'])
    await userEvent.type(await screen.findByLabelText('Name'), 'Chess Club')

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Discard your changes?' })).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Chess Club')

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Discard' }))

    expect(await screen.findByText('groups list page')).toBeInTheDocument()
  })
})
