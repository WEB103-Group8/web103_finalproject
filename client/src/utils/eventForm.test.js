// these tests check how the event form values become what the server expects, and back
import { describe, expect, it } from 'vitest'
import { buildEventPayload, changedFields, checkEventValues, minutesBetween, toFormErrors, valuesFromEvent } from './eventForm'

const venue = { venue_id: 9, venue_name: 'City Hall', address: '500 W 2nd St', city: 'Austin', state: 'TX', postal_code: '78701', latitude: 30.26, longitude: -97.74 }

const values = {
  group_id: '3',
  venue,
  event_title: ' Open Source Saturday ',
  description: ' Bring a laptop. ',
  date: '2099-01-19',
  time: '18:30',
  end_date: '2099-01-19',
  end_time: '20:00',
  capacity: '25',
  event_image_url: '',
  online: false,
  meeting_link: '',
}

describe('minutesBetween', () => {
  it('gives the length between a start and an end on the same day', () => {
    expect(minutesBetween('2099-01-19', '18:30', '2099-01-19', '20:00')).toBe(90)
  })

  it('gives the length of an event that lasts several days', () => {
    expect(minutesBetween('2099-01-19', '18:00', '2099-01-21', '12:00')).toBe(42 * 60)
  })

  it('gives the length of an event that ends after midnight, and zero or less when the end is not later', () => {
    expect(minutesBetween('2099-01-19', '22:00', '2099-01-20', '01:00')).toBe(180)
    expect(minutesBetween('2099-01-19', '18:00', '2099-01-19', '18:00')).toBe(0)
    expect(minutesBetween('2099-01-19', '18:00', '2099-01-18', '20:00')).toBeLessThan(0)
  })

  it('counts the real time even across a clock change', () => {
    expect(minutesBetween('2099-03-07', '12:00', '2099-03-08', '12:00')).toBe(24 * 60)
  })
})

describe('checkEventValues', () => {
  it('finds nothing wrong with a filled-in form', () => {
    expect(checkEventValues(values)).toEqual({})
  })

  it('says the end must come after the start', () => {
    expect(checkEventValues({ ...values, end_time: '18:30' }).end_date).toBe('The end must be after the start.')
    expect(checkEventValues({ ...values, end_date: '2099-01-18' }).end_date).toBe('The end must be after the start.')
  })

  it('accepts an event that ends on a later day, even at an earlier clock time', () => {
    expect(checkEventValues({ ...values, end_date: '2099-01-21', end_time: '09:00' })).toEqual({})
  })

  it('names every field that is missing', () => {
    const empty = { group_id: '', venue: null, online: false, meeting_link: '', event_title: '  ', description: '', date: '', time: '', end_date: '', end_time: '', capacity: '', event_image_url: '' }

    expect(Object.keys(checkEventValues(empty)).sort()).toEqual(['capacity', 'date', 'description', 'end_date', 'end_time', 'event_title', 'group_id', 'time', 'venue_id'])
  })
})

describe('buildEventPayload', () => {
  it('trims the text, uses numbers for ids and capacity, and works out the length', () => {
    expect(buildEventPayload(values)).toEqual({
      group_id: 3,
      venue_id: 9,
      meeting_link: null,
      event_title: 'Open Source Saturday',
      description: 'Bring a laptop.',
      date: '2099-01-19',
      time: '18:30',
      duration_minutes: 90,
      capacity: 25,
      event_image_url: '',
    })
  })
})

describe('buildEventPayload for a several-day event', () => {
  it('works out the length from the start and the end date', () => {
    expect(buildEventPayload({ ...values, end_date: '2099-01-21', end_time: '20:00' }).duration_minutes).toBe(2 * 24 * 60 + 90)
  })
})

describe('valuesFromEvent', () => {
  it('fills the form from an event, with the end time read from its end', () => {
    const event = {
      group_id: 3,
      venue_id: 9,
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
      latitude: 30.26,
      longitude: -97.74,
    }

    expect(valuesFromEvent(event)).toEqual({ ...values, event_title: 'Open Source Saturday', description: 'Bring a laptop.' })
    expect(valuesFromEvent({ ...event, end_time: '2099-01-21T12:00:00' }).end_date).toBe('2099-01-21')
  })

  it('round-trips to the same payload, so an untouched edit changes nothing', () => {
    const event = { group_id: 3, venue_id: 9, event_title: 'A', description: 'B', start_time: '2099-01-19T18:30:00', end_time: '2099-01-19T20:00:00', capacity: 5, event_image_url: 'https://x.test/a.png', ...venue }
    const initial = valuesFromEvent(event)

    expect(changedFields(buildEventPayload(initial), buildEventPayload(initial))).toEqual({})
  })
})

describe('changedFields', () => {
  it('keeps only the fields that are different', () => {
    expect(changedFields({ a: 1, b: 2, c: 3 }, { a: 1, b: 5, c: 3 })).toEqual({ b: 5 })
  })
})

describe('toFormErrors', () => {
  it('shows a length problem under the end time', () => {
    expect(toFormErrors({ duration_minutes: 'That duration is too long.', capacity: 'Too big.' })).toEqual({ end_time: 'That duration is too long.', capacity: 'Too big.' })
  })

  it('gives nothing for no details', () => {
    expect(toFormErrors(undefined)).toEqual({})
  })
})

describe('online events', () => {
  const online = { ...values, venue: null, online: true, meeting_link: ' https://meet.example.com/abc ' }

  it('needs a meeting link instead of a venue', () => {
    expect(checkEventValues(online)).toEqual({})
    expect(checkEventValues({ ...online, meeting_link: '  ' }).meeting_link).toBe('Enter the meeting link.')
    expect(checkEventValues({ ...online, meeting_link: 'my zoom room' }).meeting_link).toMatch(/web address/)
    expect(checkEventValues({ ...online, meeting_link: 'ftp://files.example.com' }).meeting_link).toMatch(/web address/)
    expect('venue_id' in checkEventValues(online)).toBe(false)
  })

  it('still needs a venue when the event is not online', () => {
    expect(checkEventValues({ ...values, venue: null }).venue_id).toBe('Choose or add a venue.')
  })

  it('sends the trimmed meeting link and no venue', () => {
    expect(buildEventPayload(online)).toMatchObject({ venue_id: null, meeting_link: 'https://meet.example.com/abc' })
  })

  it('fills the form from an online event, with no venue', () => {
    const event = { group_id: 3, venue_id: null, meeting_link: 'https://meet.example.com/abc', event_title: 'A', description: 'B', start_time: '2099-01-19T18:30:00', end_time: '2099-01-19T20:00:00', capacity: 5, event_image_url: null }
    const filled = valuesFromEvent(event)

    expect(filled).toMatchObject({ online: true, venue: null, meeting_link: 'https://meet.example.com/abc' })
    expect(changedFields(buildEventPayload(filled), buildEventPayload(filled))).toEqual({})
  })

  it('sends only the venue and the link when an event moves from a venue to online and back', () => {
    const atVenue = { ...values }
    expect(changedFields(buildEventPayload(atVenue), buildEventPayload(online))).toEqual({ venue_id: null, meeting_link: 'https://meet.example.com/abc' })
    expect(changedFields(buildEventPayload(online), buildEventPayload(atVenue))).toEqual({ venue_id: 9, meeting_link: null })
  })
})
