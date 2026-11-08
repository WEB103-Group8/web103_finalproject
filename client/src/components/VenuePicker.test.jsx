// these tests check the venue picker: a dropdown of saved venues with + Add Venue, and adding a new one from just a name and an address
import { render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../context/ToastContext'
import { ApiError } from '../utils/request'

// replace the venues service and the real map with ones the test controls
vi.mock('../services/VenuesAPI', () => ({ default: { getVenues: vi.fn(), getVenue: vi.fn(), lookupVenue: vi.fn(), createVenue: vi.fn() } }))
vi.mock('./VenuePreviewMap', () => ({ default: ({ label }) => <div data-testid="map">{label}</div> }))

const { default: VenuesAPI } = await import('../services/VenuesAPI')
const { default: VenuePicker } = await import('./VenuePicker')

const hall = { venue_id: 9, venue_name: 'City Hall', address: '500 W 2nd St', city: 'Austin', state: 'TX', postal_code: '78701' }
const place = { address: '500 W 2nd St, Austin, TX 78701', city: 'Austin', state: 'TX', postal_code: '78701', latitude: 30.26, longitude: -97.74 }

beforeEach(() => {
  for (const fn of Object.values(VenuesAPI)) fn.mockReset()
})

describe('VenuePicker searching saved venues', () => {
  it('lists matching venues as the person types, and chooses the one they click', async () => {
    VenuesAPI.getVenues.mockResolvedValue([hall])
    const change = vi.fn()
    render(<VenuePicker value={null} onChange={change} />)

    await userEvent.type(screen.getByLabelText('Venue'), 'aus')
    await userEvent.click(await screen.findByRole('button', { name: 'City Hall - Austin, TX' }))

    expect(VenuesAPI.getVenues).toHaveBeenCalledWith({ q: 'aus' })
    expect(change).toHaveBeenCalledWith(hall)
  })

  it('shows the dropdown with + Add Venue as soon as the box is clicked, and closes it with Escape', async () => {
    render(<VenuePicker value={null} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: '+ Add Venue' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Venue'))
    expect(screen.getByRole('button', { name: '+ Add Venue' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: '+ Add Venue' })).not.toBeInTheDocument()
  })

  it('keeps + Add Venue at the end of the matching venues, and starts the new venue with what was typed', async () => {
    VenuesAPI.getVenues.mockResolvedValue([hall])
    render(<VenuePicker value={null} onChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('Venue'), 'Cafe Mocha')
    await screen.findByRole('button', { name: 'City Hall - Austin, TX' })
    const buttons = within(screen.getByRole('list', { name: 'Venue results' })).getAllByRole('button')

    expect(buttons.map((button) => button.textContent)).toEqual(['City Hall - Austin, TX', '+ Add Venue'])

    await userEvent.click(screen.getByRole('button', { name: '+ Add Venue' }))

    expect(screen.getByLabelText('Venue name')).toHaveValue('Cafe Mocha')
  })

  it('says so when no venue matches, and still offers + Add Venue', async () => {
    VenuesAPI.getVenues.mockResolvedValue([])
    render(<VenuePicker value={null} onChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('Venue'), 'zzz')

    expect(await screen.findByText('No venues found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add Venue' })).toBeInTheDocument()
  })

  it('shows the chosen venue with a way to change it', async () => {
    const change = vi.fn()
    render(<VenuePicker value={hall} onChange={change} />)

    expect(screen.getByText('City Hall')).toBeInTheDocument()
    expect(screen.getByText(/500 W 2nd St, Austin, TX 78701/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Change venue' }))

    expect(change).toHaveBeenCalledWith(null)
  })

  it('shows the problem passed in by the form', () => {
    render(<VenuePicker value={null} onChange={() => {}} error="Choose or add a venue." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Choose or add a venue.')
  })
})

describe('VenuePicker adding a new venue', () => {
  // switch to the new-venue inputs
  const openNewVenue = async () => {
    await userEvent.click(screen.getByLabelText('Venue'))
    await userEvent.click(screen.getByRole('button', { name: '+ Add Venue' }))
  }

  it('asks only for a name and an address, with no latitude or longitude', async () => {
    render(<VenuePicker value={null} onChange={() => {}} />)
    await openNewVenue()

    expect(screen.getByLabelText('Venue name')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    expect(screen.queryByLabelText(/latitude|longitude/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find address' })).toBeDisabled()
  })

  it('finds the address, shows it on the map, then saves it and chooses it', async () => {
    VenuesAPI.lookupVenue.mockResolvedValue(place)
    VenuesAPI.createVenue.mockResolvedValue(hall)
    const change = vi.fn()
    render(<VenuePicker value={null} onChange={change} />)
    await openNewVenue()

    await userEvent.type(screen.getByLabelText('Venue name'), 'City Hall')
    await userEvent.type(screen.getByLabelText('Address'), '500 W 2nd St, Austin, TX 78701')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))

    expect(await screen.findByTestId('map')).toHaveTextContent('City Hall')
    expect(screen.getByText('Found: Austin, TX 78701')).toBeInTheDocument()
    expect(VenuesAPI.lookupVenue).toHaveBeenCalledWith('500 W 2nd St, Austin, TX 78701')

    await userEvent.click(screen.getByRole('button', { name: 'Use this venue' }))

    expect(VenuesAPI.createVenue).toHaveBeenCalledWith('City Hall', '500 W 2nd St, Austin, TX 78701')
    await waitFor(() => expect(change).toHaveBeenCalledWith(hall))
  })

  it('hides the found place again when the address is edited', async () => {
    VenuesAPI.lookupVenue.mockResolvedValue(place)
    render(<VenuePicker value={null} onChange={() => {}} />)
    await openNewVenue()

    await userEvent.type(screen.getByLabelText('Address'), '500 W 2nd St')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))
    await screen.findByTestId('map')

    await userEvent.type(screen.getByLabelText('Address'), 'x')

    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('shows the lookup problem next to the address', async () => {
    VenuesAPI.lookupVenue.mockRejectedValue(new ApiError(422, 'Please fix.', { address: "We couldn't find that address. Include street, city and state." }))
    render(<VenuePicker value={null} onChange={() => {}} />)
    await openNewVenue()

    await userEvent.type(screen.getByLabelText('Address'), 'nowhere')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't find that address. Include street, city and state.")
  })

  it('shows a general message when the lookup service is down', async () => {
    VenuesAPI.lookupVenue.mockRejectedValue(new ApiError(503, 'Address lookup is unavailable right now. Try again in a moment.'))
    render(<VenuePicker value={null} onChange={() => {}} />)
    await openNewVenue()

    await userEvent.type(screen.getByLabelText('Address'), '500 W 2nd St')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Address lookup is unavailable right now. Try again in a moment.')
  })

  it('uses the existing venue when the same one was already saved', async () => {
    VenuesAPI.lookupVenue.mockResolvedValue(place)
    VenuesAPI.createVenue.mockRejectedValue(new ApiError(409, 'That venue already exists.', { venue_id: 9 }))
    VenuesAPI.getVenue.mockResolvedValue(hall)
    const change = vi.fn()
    render(<VenuePicker value={null} onChange={change} />)
    await openNewVenue()

    await userEvent.type(screen.getByLabelText('Venue name'), 'City Hall')
    await userEvent.type(screen.getByLabelText('Address'), '500 W 2nd St, Austin, TX 78701')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Use this venue' }))

    await waitFor(() => expect(change).toHaveBeenCalledWith(hall))
    expect(VenuesAPI.getVenue).toHaveBeenCalledWith(9)
  })

  it('can go back to searching saved venues', async () => {
    render(<VenuePicker value={null} onChange={() => {}} />)
    await openNewVenue()

    await userEvent.click(screen.getByRole('button', { name: 'Search saved venues instead' }))

    expect(screen.getByLabelText('Venue')).toBeInTheDocument()
  })
})

describe('VenuePicker pop-ups', () => {
  it('says the venue was added after it is saved, but not when an existing venue is reused', async () => {
    const notify = vi.fn()
    VenuesAPI.lookupVenue.mockResolvedValue(place)
    VenuesAPI.createVenue.mockResolvedValue(hall)
    render(
      <ToastContext.Provider value={{ notify }}>
        <VenuePicker value={null} onChange={() => {}} />
      </ToastContext.Provider>,
    )
    await userEvent.click(screen.getByLabelText('Venue'))
    await userEvent.click(screen.getByRole('button', { name: '+ Add Venue' }))
    await userEvent.type(screen.getByLabelText('Venue name'), 'City Hall')
    await userEvent.type(screen.getByLabelText('Address'), '500 W 2nd St, Austin, TX 78701')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Use this venue' }))

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Venue added.'))
  })

  it('says nothing when the venue already existed', async () => {
    const notify = vi.fn()
    VenuesAPI.lookupVenue.mockResolvedValue(place)
    VenuesAPI.createVenue.mockRejectedValue(new ApiError(409, 'That venue already exists.', { venue_id: 9 }))
    VenuesAPI.getVenue.mockResolvedValue(hall)
    const change = vi.fn()
    render(
      <ToastContext.Provider value={{ notify }}>
        <VenuePicker value={null} onChange={change} />
      </ToastContext.Provider>,
    )
    await userEvent.click(screen.getByLabelText('Venue'))
    await userEvent.click(screen.getByRole('button', { name: '+ Add Venue' }))
    await userEvent.type(screen.getByLabelText('Venue name'), 'City Hall')
    await userEvent.type(screen.getByLabelText('Address'), '500 W 2nd St, Austin, TX 78701')
    await userEvent.click(screen.getByRole('button', { name: 'Find address' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Use this venue' }))

    await waitFor(() => expect(change).toHaveBeenCalledWith(hall))
    expect(notify).not.toHaveBeenCalled()
  })
})

// a stand-in for the form: it keeps the venue, whether the event is online, and the meeting link, like the real form does
const Harness = ({ onVenue = () => {} }) => {
  const [venue, setVenue] = useState(null)
  const [online, setOnline] = useState(false)
  const [link, setLink] = useState('')

  return (
    <VenuePicker
      value={venue}
      online={online}
      meetingLink={link}
      onChange={(chosen) => {
        setVenue(chosen)
        onVenue(chosen)
      }}
      onOnlineChange={setOnline}
      onMeetingLinkChange={setLink}
    />
  )
}

describe('VenuePicker online option', () => {
  it('starts the dropdown with Online, before any venue, as soon as the box is clicked', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByLabelText('Venue'))

    const buttons = within(screen.getByRole('list', { name: 'Venue results' })).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual(['Online', '+ Add Venue'])
  })

  it('shows Online while the typed letters fit the word, and hides it for other words', async () => {
    VenuesAPI.getVenues.mockResolvedValue([])
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Venue'), 'onl')
    expect(screen.getByRole('button', { name: 'Online' })).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Venue'))
    await userEvent.type(screen.getByLabelText('Venue'), 'austin')
    expect(screen.queryByRole('button', { name: 'Online' })).not.toBeInTheDocument()
  })

  it('turns the same box into a Meeting link box when Online is chosen', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Venue'))
    const boxBefore = screen.getByLabelText('Venue')

    await userEvent.click(screen.getByRole('button', { name: 'Online' }))

    const boxAfter = screen.getByLabelText('Meeting link')
    expect(boxAfter.id).toBe(boxBefore.id)
    expect(screen.queryByLabelText('Venue')).not.toBeInTheDocument()
    expect(boxAfter).toHaveAttribute('placeholder', expect.stringContaining('https://'))
  })

  it('lets the person type the meeting link', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Venue'))
    await userEvent.click(screen.getByRole('button', { name: 'Online' }))

    await userEvent.type(screen.getByLabelText('Meeting link'), 'https://meet.example.com/abc')

    expect(screen.getByLabelText('Meeting link')).toHaveValue('https://meet.example.com/abc')
  })

  it('shows the problem passed in by the form next to the meeting link', async () => {
    render(<VenuePicker value={null} online meetingLink="" error="Enter the meeting link." onChange={() => {}} onOnlineChange={() => {}} onMeetingLinkChange={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter the meeting link.')
  })

  it('goes back to choosing a venue with the "Choose a venue instead" button', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Venue'))
    await userEvent.click(screen.getByRole('button', { name: 'Online' }))

    await userEvent.click(screen.getByRole('button', { name: 'Choose a venue instead' }))

    expect(screen.getByLabelText('Venue')).toBeInTheDocument()
    expect(screen.queryByLabelText('Meeting link')).not.toBeInTheDocument()
  })

  it('still lets a saved venue be chosen after going back', async () => {
    VenuesAPI.getVenues.mockResolvedValue([hall])
    const chosen = vi.fn()
    render(<Harness onVenue={chosen} />)
    await userEvent.click(screen.getByLabelText('Venue'))
    await userEvent.click(screen.getByRole('button', { name: 'Online' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose a venue instead' }))

    await userEvent.type(screen.getByLabelText('Venue'), 'aus')
    await userEvent.click(await screen.findByRole('button', { name: 'City Hall - Austin, TX' }))

    expect(chosen).toHaveBeenCalledWith(hall)
  })
})
