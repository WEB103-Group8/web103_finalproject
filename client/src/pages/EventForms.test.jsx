// these tests check creating and editing an event as a host: the form, what is sent, and who may use it
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionContext } from '../context/SessionContext'
import { ToastContext } from '../context/ToastContext'
import { ApiError } from '../utils/request'

// replace the services, and the venue picker (tested on its own), with ones the test controls
vi.mock('../services/EventsAPI', () => ({ default: { getEvent: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn() } }))
vi.mock('../services/GroupsAPI', () => ({ default: { getGroups: vi.fn(), createGroup: vi.fn() } }))
vi.mock('../services/CategoriesAPI', () => ({ default: { getCategories: vi.fn() } }))
vi.mock('../components/VenuePicker', () => ({
  default: ({ value, online, meetingLink, onChange, onOnlineChange, onMeetingLinkChange, error }) => (
    <div>
      <p>{value ? `Venue: ${value.venue_name}` : 'No venue'}</p>
      {error && <p role="alert">{error}</p>}
      {online ? (
        <label>
          Meeting link
          <input value={meetingLink} onChange={(event) => onMeetingLinkChange(event.target.value)} />
        </label>
      ) : (
        <>
          <button type="button" onClick={() => onChange({ venue_id: 9, venue_name: 'City Hall', address: '500 W 2nd St', city: 'Austin', state: 'TX', postal_code: '78701' })}>
            Pick venue
          </button>
          <button type="button" onClick={() => onOnlineChange(true)}>
            Pick online
          </button>
        </>
      )}
    </div>
  ),
}))

const { default: EventsAPI } = await import('../services/EventsAPI')
const { default: GroupsAPI } = await import('../services/GroupsAPI')
const { default: CategoriesAPI } = await import('../services/CategoriesAPI')
const { default: EventCreate } = await import('./EventCreate')
const { default: EventEdit } = await import('./EventEdit')

const host = { user_id: 5, is_host: true }

// the pop-up messages the pages ask for
const notify = vi.fn()
const myGroup = { group_id: 3, group_name: 'Code & Coffee', organizer_id: 5 }
const otherGroup = { group_id: 4, group_name: 'Not Mine', organizer_id: 6 }

// draw a page for a person, with pretend pages to land on
const renderAt = (address, user = host, history = [address]) =>
  render(
    <ToastContext.Provider value={{ notify }}>
      <SessionContext.Provider value={{ user, needsOnboarding: false, loading: false, signOut: vi.fn() }}>
        <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
          <Routes>
            <Route path="/events/new" element={<EventCreate />} />
            <Route path="/events/:eventId/edit" element={<EventEdit />} />
            <Route path="/events/:eventId" element={<p>event page</p>} />
            <Route path="/events" element={<p>events list page</p>} />
            <Route path="/groups/new" element={<p>create group page</p>} />
          </Routes>
        </MemoryRouter>
      </SessionContext.Provider>
    </ToastContext.Provider>,
  )

// pick a group the way a person does: type part of its name, then click it in the dropdown
const chooseGroup = async () => {
  await userEvent.type(screen.getByLabelText('Group'), 'coffee')
  await userEvent.click(screen.getByRole('button', { name: 'Code & Coffee' }))
}

// open the group dropdown and choose + Add New Group
const startNewGroup = async () => {
  await userEvent.click(await screen.findByLabelText('Group'))
  await userEvent.click(screen.getByRole('button', { name: '+ Add New Group' }))
}

// fill in the whole create form
const fillForm = async () => {
  await chooseGroup()
  await userEvent.type(screen.getByLabelText('Title'), 'Open Source Saturday')
  await userEvent.type(screen.getByLabelText('Description'), 'Bring a laptop.')
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-01-19' } })
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '18:30' } })
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: '20:00' } })
  await userEvent.type(screen.getByLabelText('Capacity'), '25')
  await userEvent.click(screen.getByRole('button', { name: 'Pick venue' }))
}

beforeEach(() => {
  notify.mockReset()
  for (const service of [EventsAPI, GroupsAPI, CategoriesAPI]) for (const fn of Object.values(service)) fn.mockReset()
  GroupsAPI.getGroups.mockResolvedValue([myGroup, otherGroup])
  CategoriesAPI.getCategories.mockResolvedValue(['Food', 'Technology'])
})

describe('EventCreate', () => {
  it('shows the host\'s own groups in a dropdown that narrows as they type, and never other hosts\' groups', async () => {
    renderAt('/events/new')

    await userEvent.click(await screen.findByLabelText('Group'))
    const list = screen.getByRole('list', { name: 'Group results' })
    expect(within(list).getAllByRole('button').map((button) => button.textContent)).toEqual(['Code & Coffee', '+ Add New Group'])

    await userEvent.type(screen.getByLabelText('Group'), 'zzz')
    expect(screen.getByText('No matching group.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Not Mine' })).not.toBeInTheDocument()
  })

  it('finds a group by any part of its name, in any order', async () => {
    renderAt('/events/new')

    await userEvent.type(await screen.findByLabelText('Group'), 'coffee code')

    expect(screen.getByRole('button', { name: 'Code & Coffee' })).toBeInTheDocument()
  })

  it('has the group already chosen when opened from a group', async () => {
    renderAt('/events/new?group=3')

    expect(await screen.findByLabelText('Group')).toHaveValue('Code & Coffee')
  })

  it('lets a host with no group add one right in the form, which is then chosen', async () => {
    GroupsAPI.getGroups.mockResolvedValue([otherGroup])
    GroupsAPI.createGroup.mockResolvedValue({ group_id: 20, group_name: 'Fresh Group', category: 'Food', organizer_id: 5 })
    renderAt('/events/new')

    await startNewGroup()
    await userEvent.type(screen.getByLabelText('Group name'), 'Fresh Group')
    await userEvent.type(screen.getByLabelText('Category'), 'Food')
    await userEvent.click(screen.getByRole('button', { name: 'Save group' }))

    expect(GroupsAPI.createGroup).toHaveBeenCalledWith({ group_name: 'Fresh Group', category: 'Food', description: '', group_image_url: '' })
    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('Fresh Group'))
    expect(screen.queryByLabelText('Group name')).not.toBeInTheDocument()
  })

  it('starts the new group with the name that was typed in the group box', async () => {
    renderAt('/events/new')

    await userEvent.type(await screen.findByLabelText('Group'), 'Chess Club')
    await userEvent.click(screen.getByRole('button', { name: '+ Add New Group' }))

    expect(screen.getByLabelText('Group name')).toHaveValue('Chess Club')
  })

  it('lets the new group start a brand-new category, which the next new group can pick', async () => {
    GroupsAPI.createGroup.mockResolvedValue({ group_id: 21, group_name: 'Chess', category: 'Board Games', organizer_id: 5 })
    renderAt('/events/new')

    await startNewGroup()
    await userEvent.type(screen.getByLabelText('Group name'), 'Chess')
    await userEvent.type(screen.getByLabelText('Category'), 'Board Games')
    expect(screen.getByText('"Board Games" is a new category and will be added.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save group' }))
    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('Chess'))

    await userEvent.clear(screen.getByLabelText('Group'))
    await userEvent.click(screen.getByRole('button', { name: '+ Add New Group' }))
    await userEvent.click(screen.getByLabelText('Category'))

    expect(GroupsAPI.createGroup).toHaveBeenCalledWith(expect.objectContaining({ category: 'Board Games' }))
    expect(within(screen.getByRole('list', { name: 'Category results' })).getByRole('button', { name: 'Board Games' })).toBeInTheDocument()
  })

  it('names the missing fields of the new group, and shows what the server did not accept', async () => {
    GroupsAPI.createGroup.mockRejectedValue(new ApiError(400, 'Please fix the highlighted fields.', { group_name: 'Group name is required.' }))
    renderAt('/events/new')

    await startNewGroup()
    await userEvent.click(screen.getByRole('button', { name: 'Save group' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(GroupsAPI.createGroup).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Group name'), 'x')
    await userEvent.type(screen.getByLabelText('Category'), 'Food')
    await userEvent.click(screen.getByRole('button', { name: 'Save group' }))

    expect(await screen.findByText('Group name is required.')).toBeInTheDocument()
  })

  it('does not accept typed text that was never picked from the list as a group', async () => {
    renderAt('/events/new')

    await userEvent.type(await screen.findByLabelText('Group'), 'Code & Coffee')
    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(screen.getByText('Choose a group from the list, or add a new one.')).toBeInTheDocument()
    expect(EventsAPI.createEvent).not.toHaveBeenCalled()
  })

  it('names every missing field and sends nothing', async () => {
    renderAt('/events/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Create Event' }))

    for (const message of ['Choose a group from the list, or add a new one.', 'Title is required.', 'Description is required.', 'Start date is required.', 'Start time is required.', 'End date is required.', 'End time is required.', 'Capacity is required.', 'Choose or add a venue.']) {
      expect(screen.getByText(message)).toBeInTheDocument()
    }
    expect(EventsAPI.createEvent).not.toHaveBeenCalled()
  })

  it('creates the event, with the length worked out from the start and end times, then shows it', async () => {
    EventsAPI.createEvent.mockResolvedValue({ event_id: 77 })
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await fillForm()

    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(EventsAPI.createEvent).toHaveBeenCalledWith({
      group_id: 3,
      venue_id: 9,
      event_title: 'Open Source Saturday',
      description: 'Bring a laptop.',
      date: '2099-01-19',
      time: '18:30',
      duration_minutes: 90,
      capacity: 25,
      event_image_url: '',
      meeting_link: null,
    })
    expect(await screen.findByText('event page')).toBeInTheDocument()
  })

  it('fills the end date with the start date when it is empty, so a one-day event needs only the times', async () => {
    renderAt('/events/new')

    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2099-01-19' } })

    expect(screen.getByLabelText('End date')).toHaveValue('2099-01-19')
  })

  it('keeps an end date that was already chosen when the start date changes', async () => {
    renderAt('/events/new')
    const start = await screen.findByLabelText('Start date')

    fireEvent.change(start, { target: { value: '2099-01-19' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-01-22' } })
    fireEvent.change(start, { target: { value: '2099-01-20' } })

    expect(screen.getByLabelText('End date')).toHaveValue('2099-01-22')
  })

  it('creates an event that lasts several days, with the length counted from the start date to the end date', async () => {
    EventsAPI.createEvent.mockResolvedValue({ event_id: 78 })
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await fillForm()

    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-01-21' } })
    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(EventsAPI.createEvent).toHaveBeenCalledWith(expect.objectContaining({ date: '2099-01-19', time: '18:30', duration_minutes: 2 * 24 * 60 + 90 }))
  })

  it('refuses an end that is not after the start, and sends nothing', async () => {
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await fillForm()

    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '18:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(screen.getByText('The end must be after the start.')).toBeInTheDocument()
    expect(EventsAPI.createEvent).not.toHaveBeenCalled()
  })

  it('shows what the server did not accept next to the right fields', async () => {
    EventsAPI.createEvent.mockRejectedValue(new ApiError(400, 'Please fix the highlighted fields.', { date: 'The event must start in the future.', duration_minutes: 'That duration is too long.' }))
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await fillForm()

    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(await screen.findByText('The event must start in the future.')).toBeInTheDocument()
    expect(screen.getByText('That duration is too long.')).toBeInTheDocument()
    expect(screen.getByText('Please fix the highlighted fields.')).toBeInTheDocument()
  })
})

describe('EventEdit', () => {
  const event = {
    event_id: 7,
    group_id: 3,
    venue_id: 9,
    host_id: 5,
    event_title: 'Open Source Saturday',
    description: 'Bring a laptop.',
    start_time: '2099-01-19T18:30:00',
    end_time: '2099-01-19T20:00:00',
    capacity: 25,
    event_image_url: null,
    venue_name: 'City Hall',
    address: '500 W 2nd St',
    city: 'Austin',
    state: 'TX',
    postal_code: '78701',
  }

  beforeEach(() => {
    EventsAPI.getEvent.mockResolvedValue(event)
    EventsAPI.updateEvent.mockResolvedValue({})
  })

  it('fills the form with the event, including its end time', async () => {
    renderAt('/events/7/edit')

    expect(await screen.findByLabelText('Title')).toHaveValue('Open Source Saturday')
    expect(screen.getByLabelText('Start date')).toHaveValue('2099-01-19')
    expect(screen.getByLabelText('Start time')).toHaveValue('18:30')
    expect(screen.getByLabelText('End date')).toHaveValue('2099-01-19')
    expect(screen.getByLabelText('End time')).toHaveValue('20:00')
    expect(screen.getByLabelText('Capacity')).toHaveValue(25)
    expect(screen.getByText('Venue: City Hall')).toBeInTheDocument()
  })

  it('sends only what changed, then shows the event', async () => {
    renderAt('/events/7/edit')
    const capacity = await screen.findByLabelText('Capacity')

    await userEvent.clear(capacity)
    await userEvent.type(capacity, '40')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(EventsAPI.updateEvent).toHaveBeenCalledWith(7, { capacity: 40 })
    expect(await screen.findByText('event page')).toBeInTheDocument()
  })

  it('sends the new length when only the end time changes', async () => {
    renderAt('/events/7/edit')
    await screen.findByLabelText('End time')

    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '21:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(EventsAPI.updateEvent).toHaveBeenCalledWith(7, { duration_minutes: 150 })
  })

  it('sends the new length when only the end date changes', async () => {
    renderAt('/events/7/edit')
    await screen.findByLabelText('End date')

    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-01-20' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(EventsAPI.updateEvent).toHaveBeenCalledWith(7, { duration_minutes: 90 + 24 * 60 })
  })

  it('shows a several-day event with its own end date', async () => {
    EventsAPI.getEvent.mockResolvedValue({ ...event, end_time: '2099-01-22T12:00:00' })
    renderAt('/events/7/edit')

    expect(await screen.findByLabelText('End date')).toHaveValue('2099-01-22')
    expect(screen.getByLabelText('End time')).toHaveValue('12:00')
  })

  it('sends nothing when nothing changed', async () => {
    renderAt('/events/7/edit')

    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    expect(EventsAPI.updateEvent).not.toHaveBeenCalled()
    expect(await screen.findByText('event page')).toBeInTheDocument()
  })

  it('shows the server problem next to the field', async () => {
    EventsAPI.updateEvent.mockRejectedValue(new ApiError(400, 'Please fix the highlighted fields.', { capacity: 'Capacity cannot be lower than the 30 people attending.' }))
    renderAt('/events/7/edit')
    const capacity = await screen.findByLabelText('Capacity')

    await userEvent.clear(capacity)
    await userEvent.type(capacity, '5')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Capacity cannot be lower than the 30 people attending.')).toBeInTheDocument()
  })

  it('blocks a host who does not organize the event', async () => {
    renderAt('/events/7/edit', { user_id: 6, is_host: true })

    expect(await screen.findByText('You can only edit events you host.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })

  it('deletes only after confirming, then goes back to the list', async () => {
    EventsAPI.deleteEvent.mockResolvedValue(null)
    renderAt('/events/7/edit')

    await userEvent.click(await screen.findByRole('button', { name: 'Delete event' }))
    expect(EventsAPI.deleteEvent).not.toHaveBeenCalled()

    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    expect(EventsAPI.deleteEvent).toHaveBeenCalledWith(7)
    expect(await screen.findByText('events list page')).toBeInTheDocument()
  })
})

describe('pop-ups on the event forms', () => {
  it('says the event was created', async () => {
    EventsAPI.createEvent.mockResolvedValue({ event_id: 77 })
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await fillForm()

    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Event created.'))
  })

  it('says nothing when the event could not be created', async () => {
    EventsAPI.createEvent.mockRejectedValue(new ApiError(400, 'Please fix the highlighted fields.', { capacity: 'Too big.' }))
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await fillForm()

    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))
    await screen.findByText('Too big.')

    expect(notify).not.toHaveBeenCalled()
  })

  it('says a group was created when one is added inside the event form', async () => {
    GroupsAPI.createGroup.mockResolvedValue({ group_id: 20, group_name: 'Fresh Group', category: 'Food', organizer_id: 5 })
    renderAt('/events/new')

    await startNewGroup()
    await userEvent.type(screen.getByLabelText('Group name'), 'Fresh Group')
    await userEvent.type(screen.getByLabelText('Category'), 'Food')
    await userEvent.click(screen.getByRole('button', { name: 'Save group' }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Group created.'))
  })

  describe('when editing', () => {
    const event = {
      event_id: 7,
      group_id: 3,
      venue_id: 9,
      host_id: 5,
      event_title: 'Open Source Saturday',
      description: 'Bring a laptop.',
      start_time: '2099-01-19T18:30:00',
      end_time: '2099-01-19T20:00:00',
      capacity: 25,
      event_image_url: null,
      venue_name: 'City Hall',
      address: '500 W 2nd St',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
    }

    beforeEach(() => {
      EventsAPI.getEvent.mockResolvedValue(event)
      EventsAPI.updateEvent.mockResolvedValue({})
    })

    it('says there was nothing to save when nothing changed', async () => {
      renderAt('/events/7/edit')
      await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
      await screen.findByText('event page')

      expect(notify).toHaveBeenCalledWith('There were no changes to save.')
      expect(EventsAPI.updateEvent).not.toHaveBeenCalled()
    })

    it('says the event was updated after a change', async () => {
      renderAt('/events/7/edit')
      const capacity = await screen.findByLabelText('Capacity')

      await userEvent.clear(capacity)
      await userEvent.type(capacity, '40')
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(notify).toHaveBeenCalledWith('Event updated.'))
    })

    it('says the event was deleted', async () => {
      EventsAPI.deleteEvent.mockResolvedValue(null)
      renderAt('/events/7/edit')

      await userEvent.click(await screen.findByRole('button', { name: 'Delete event' }))
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

      await waitFor(() => expect(notify).toHaveBeenCalledWith('Event deleted.'))
    })

    it('goes back at once when Cancel is pressed and nothing was changed', async () => {
      renderAt('/events/7/edit', host, ['/events/7', '/events/7/edit'])

      await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      expect(await screen.findByText('event page')).toBeInTheDocument()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('asks "are you sure?" when Cancel is pressed after a change, and keeps the form when told to', async () => {
      renderAt('/events/7/edit', host, ['/events/7', '/events/7/edit'])
      await userEvent.type(await screen.findByLabelText('Title'), ' (new)')

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      const question = screen.getByRole('alertdialog', { name: 'Discard your changes?' })
      await userEvent.click(within(question).getByRole('button', { name: 'Keep editing' }))

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveValue('Open Source Saturday (new)')
    })

    it('goes back after the person agrees to discard their changes', async () => {
      renderAt('/events/7/edit', host, ['/events/7', '/events/7/edit'])
      await userEvent.type(await screen.findByLabelText('Title'), ' (new)')

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Discard' }))

      expect(await screen.findByText('event page')).toBeInTheDocument()
      expect(EventsAPI.updateEvent).not.toHaveBeenCalled()
    })
  })
})

describe('online events on the event forms', () => {
  it('creates an online event with a meeting link and no venue', async () => {
    EventsAPI.createEvent.mockResolvedValue({ event_id: 79 })
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await chooseGroup()
    await userEvent.type(screen.getByLabelText('Title'), 'Online Meetup')
    await userEvent.type(screen.getByLabelText('Description'), 'From home.')
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-01-19' } })
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '18:30' } })
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '19:30' } })
    await userEvent.type(screen.getByLabelText('Capacity'), '10')

    await userEvent.click(screen.getByRole('button', { name: 'Pick online' }))
    await userEvent.type(screen.getByLabelText('Meeting link'), ' https://meet.example.com/abc ')
    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(EventsAPI.createEvent).toHaveBeenCalledWith(expect.objectContaining({ venue_id: null, meeting_link: 'https://meet.example.com/abc', duration_minutes: 60 }))
  })

  it('asks for the meeting link when Online is chosen and the link is missing, and sends nothing', async () => {
    renderAt('/events/new')
    await screen.findByLabelText('Group')
    await userEvent.click(screen.getByRole('button', { name: 'Pick online' }))

    await userEvent.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(screen.getByText('Enter the meeting link.')).toBeInTheDocument()
    expect(screen.queryByText('Choose or add a venue.')).not.toBeInTheDocument()
    expect(EventsAPI.createEvent).not.toHaveBeenCalled()
  })

  it('shows the meeting link when an online event is edited, and sends only the new link when it changes', async () => {
    EventsAPI.getEvent.mockResolvedValue({
      event_id: 7,
      group_id: 3,
      venue_id: null,
      meeting_link: 'https://meet.example.com/abc',
      host_id: 5,
      event_title: 'Online Meetup',
      description: 'From home.',
      start_time: '2099-01-19T18:30:00',
      end_time: '2099-01-19T19:30:00',
      capacity: 10,
      event_image_url: null,
    })
    EventsAPI.updateEvent.mockResolvedValue({})
    renderAt('/events/7/edit')
    const link = await screen.findByLabelText('Meeting link')
    expect(link).toHaveValue('https://meet.example.com/abc')

    await userEvent.clear(link)
    await userEvent.type(link, 'https://meet.example.com/new')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(EventsAPI.updateEvent).toHaveBeenCalledWith(7, { meeting_link: 'https://meet.example.com/new' })
  })
})
