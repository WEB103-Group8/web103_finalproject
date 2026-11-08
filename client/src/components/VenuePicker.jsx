import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import VenuesAPI from '../services/VenuesAPI'
import Combobox from './Combobox'
import FormField from './FormField'
import VenuePreviewMap from './VenuePreviewMap'
import '../css/VenuePicker.css'

// search suggestions start after this many typed letters, and wait this long (in milliseconds) after the last key
const MIN_SEARCH_LETTERS = 2
const SEARCH_DELAY_MS = 250

// the one-line place a venue is at
const describePlace = (venue) => `${venue.address}, ${venue.city}, ${venue.state} ${venue.postal_code}`

// choose where an event happens: a dropdown that starts with "Online", then the saved venues that narrow as you type, and ends with "+ Add Venue";
// choosing Online turns the same box into a Meeting link box
const VenuePicker = ({ value, online, meetingLink, onChange, onOnlineChange, onMeetingLinkChange, error }) => {
  const { notify } = useToast()
  const [mode, setMode] = useState('search')

  // searching saved venues
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const text = query.trim()

  useEffect(() => {
    if (text.length < MIN_SEARCH_LETTERS) return undefined

    let active = true
    const timer = setTimeout(() => {
      VenuesAPI.getVenues({ q: text })
        .then((venues) => active && setResults(venues))
        .catch(() => active && setResults([]))
    }, SEARCH_DELAY_MS)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [text])

  // adding a new venue
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [found, setFound] = useState(null)
  const [problem, setProblem] = useState(null)
  const [busy, setBusy] = useState(false)

  // "+ Add Venue": switch to the new-venue inputs, starting the name from what was typed
  const startNewVenue = () => {
    if (!name) setName(query.trim())
    setMode('new')
  }

  // typing a different address means the found place no longer matches
  const changeAddress = (newAddress) => {
    setAddress(newAddress)
    setFound(null)
    setProblem(null)
  }

  // look the address up and show it on the small map, without saving anything
  const findAddress = async () => {
    setBusy(true)
    setProblem(null)

    try {
      setFound(await VenuesAPI.lookupVenue(address.trim()))
    } catch (failure) {
      setFound(null)
      setProblem(failure.details?.address ?? failure.message)
    } finally {
      setBusy(false)
    }
  }

  // save the venue; if it already exists, use the existing one
  const useVenue = async () => {
    setBusy(true)
    setProblem(null)

    try {
      const created = await VenuesAPI.createVenue(name.trim(), address.trim())
      notify('Venue added.')
      onChange(created)
    } catch (failure) {
      if (failure.status === 409 && failure.details?.venue_id) {
        onChange(await VenuesAPI.getVenue(failure.details.venue_id).catch(() => null))
      } else {
        setProblem(failure.details?.address ?? failure.details?.venue_name ?? failure.message)
      }
    } finally {
      setBusy(false)
    }
  }

  // the dropdown starts with "Online" when nothing is typed, or when what is typed fits the word
  const showsOnline = text === '' || 'online'.includes(text.toLowerCase())
  const options = [
    ...(showsOnline ? [{ key: 'online', label: 'Online' }] : []),
    ...(text.length >= MIN_SEARCH_LETTERS ? results.map((venue) => ({ key: venue.venue_id, label: `${venue.venue_name} - ${venue.city}, ${venue.state}`, venue })) : []),
  ]

  // an online event: the same box now asks for the meeting link
  if (online && !value) {
    return (
      <div className="venue-picker">
        <FormField id="venue-search" label="Meeting link" error={error}>
          <input
            id="venue-search"
            type="url"
            autoComplete="off"
            placeholder="https://meet.example.com/your-room"
            value={meetingLink}
            onChange={(event) => onMeetingLinkChange(event.target.value)}
          />
        </FormField>
        <button type="button" className="secondary" onClick={() => onOnlineChange(false)}>
          Choose a venue instead
        </button>
      </div>
    )
  }

  // a venue is already chosen: show it, with a way to change it
  if (value) {
    return (
      <div className="venue-picker">
        <p>
          <strong>{value.venue_name}</strong>
          <br />
          {describePlace(value)}
        </p>
        <button type="button" className="secondary" onClick={() => onChange(null)}>
          Change venue
        </button>
      </div>
    )
  }

  return (
    <div className="venue-picker">
      {mode === 'search' ? (
        <Combobox
          id="venue-search"
          label="Venue"
          error={error}
          placeholder="Search by name, city or state"
          query={query}
          onQueryChange={setQuery}
          options={options}
          emptyText={text.length >= MIN_SEARCH_LETTERS ? 'No venues found.' : null}
          onPick={(option) => (option.key === 'online' ? onOnlineChange(true) : onChange(option.venue))}
          addLabel="+ Add Venue"
          onAdd={startNewVenue}
          listLabel="Venue results"
        />
      ) : (
        <>
          <FormField id="venue-name" label="Venue name">
            <input id="venue-name" value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField id="venue-address" label="Address" error={problem ?? error}>
            <input id="venue-address" placeholder="500 W 2nd St, Austin, TX 78701" value={address} onChange={(event) => changeAddress(event.target.value)} />
          </FormField>

          <button type="button" disabled={busy || !address.trim()} onClick={findAddress}>
            Find address
          </button>

          {found && (
            <div className="venue-found">
              <VenuePreviewMap latitude={found.latitude} longitude={found.longitude} label={name.trim() || found.address} />
              <p>
                Found: {found.city}, {found.state} {found.postal_code}
              </p>
              <button type="button" disabled={busy || !name.trim()} onClick={useVenue}>
                Use this venue
              </button>
              {!name.trim() && <p className="field-error">Enter a venue name to use this address.</p>}
            </div>
          )}

          <button type="button" className="secondary" onClick={() => setMode('search')}>
            Search saved venues instead
          </button>
        </>
      )}
    </div>
  )
}

export default VenuePicker
