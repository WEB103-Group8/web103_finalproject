// these tests check how event times are shown and compared
import { describe, expect, it } from 'vitest'
import { formatEventRange, formatEventTime, isPast, toInstant } from './dates'

describe('formatEventTime', () => {
  it('shows the weekday, day and 12-hour time', () => {
    expect(formatEventTime('2026-11-14T18:30:00')).toBe('Sat, Nov 14 - 6:30 PM')
  })

  it('handles midnight, noon and single-digit minutes', () => {
    expect(formatEventTime('2026-11-14T00:05:00')).toBe('Sat, Nov 14 - 12:05 AM')
    expect(formatEventTime('2026-11-14T12:00:00')).toBe('Sat, Nov 14 - 12:00 PM')
  })
})

describe('formatEventRange', () => {
  it('shows only the end time when the event ends the same day', () => {
    expect(formatEventRange('2026-11-14T18:30:00', '2026-11-14T20:00:00')).toBe('Sat, Nov 14 - 6:30 PM to 8:00 PM')
  })

  it('shows the end date too when the event ends on another day', () => {
    expect(formatEventRange('2026-11-14T22:00:00', '2026-11-15T01:00:00')).toBe('Sat, Nov 14 - 10:00 PM to Sun, Nov 15 - 1:00 AM')
  })

  it('shows only the start when there is no end time', () => {
    expect(formatEventRange('2026-11-14T18:30:00', null)).toBe('Sat, Nov 14 - 6:30 PM')
  })
})

describe('isPast', () => {
  const now = new Date('2026-11-14T12:00:00').getTime()

  it('is true for a time before now and false for a time after', () => {
    expect(isPast('2026-11-14T11:59:00', undefined, now)).toBe(true)
    expect(isPast('2026-11-14T12:01:00', undefined, now)).toBe(false)
  })
})

describe('times with a time zone', () => {
  it('shows the short name of the venue\'s time zone after the time', () => {
    expect(formatEventTime('2026-11-14T18:30:00', 'America/Chicago')).toBe('Sat, Nov 14 - 6:30 PM CST')
    expect(formatEventTime('2026-11-14T18:30:00', 'America/New_York')).toBe('Sat, Nov 14 - 6:30 PM EST')
    expect(formatEventTime('2026-11-14T18:30:00', 'America/Los_Angeles')).toBe('Sat, Nov 14 - 6:30 PM PST')
    expect(formatEventTime('2026-11-14T18:30:00', 'America/Denver')).toBe('Sat, Nov 14 - 6:30 PM MST')
  })

  it('uses the summer name while the clocks are changed, and keeps a place that never changes them on its one name', () => {
    expect(formatEventTime('2027-07-10T18:30:00', 'America/Chicago')).toBe('Sat, Jul 10 - 6:30 PM CDT')
    expect(formatEventTime('2027-07-10T18:30:00', 'America/Phoenix')).toBe('Sat, Jul 10 - 6:30 PM MST')
    expect(formatEventTime('2027-01-09T18:30:00', 'America/Phoenix')).toBe('Sat, Jan 9 - 6:30 PM MST')
  })

  it('knows the names for Alaska and Hawaii', () => {
    expect(formatEventTime('2026-11-14T18:30:00', 'America/Anchorage')).toBe('Sat, Nov 14 - 6:30 PM AKST')
    expect(formatEventTime('2026-11-14T18:30:00', 'Pacific/Honolulu')).toBe('Sat, Nov 14 - 6:30 PM HST')
  })

  it('shows the zone once, after the end of a range', () => {
    expect(formatEventRange('2026-11-14T18:30:00', '2026-11-14T20:00:00', 'America/Chicago')).toBe('Sat, Nov 14 - 6:30 PM to 8:00 PM CST')
    expect(formatEventRange('2026-11-14T22:00:00', '2026-11-15T01:00:00', 'America/Chicago')).toBe('Sat, Nov 14 - 10:00 PM to Sun, Nov 15 - 1:00 AM CST')
    expect(formatEventRange('2026-11-14T18:30:00', null, 'America/Chicago')).toBe('Sat, Nov 14 - 6:30 PM CST')
  })

  it('shows no zone when none is known or the name is not usable', () => {
    expect(formatEventTime('2026-11-14T18:30:00', null)).toBe('Sat, Nov 14 - 6:30 PM')
    expect(formatEventTime('2026-11-14T18:30:00', 'Not/AZone')).toBe('Sat, Nov 14 - 6:30 PM')
  })
})

describe('toInstant', () => {
  it('turns the clock time at the venue into the exact moment, whatever this computer\'s clock says', () => {
    expect(new Date(toInstant('2026-11-14T18:30:00', 'America/Chicago')).toISOString()).toBe('2026-11-15T00:30:00.000Z')
    expect(new Date(toInstant('2027-07-10T18:30:00', 'America/Chicago')).toISOString()).toBe('2027-07-10T23:30:00.000Z')
    expect(new Date(toInstant('2026-11-14T18:30:00', 'Pacific/Honolulu')).toISOString()).toBe('2026-11-15T04:30:00.000Z')
  })

  it('reads the time as this computer\'s clock when there is no time zone', () => {
    expect(toInstant('2026-11-14T18:30:00')).toBe(new Date('2026-11-14T18:30:00').getTime())
  })
})

describe('isPast with a time zone', () => {
  it('compares the exact moment, so the same clock time can be past in one zone and not yet in another', () => {
    const now = Date.parse('2026-11-15T01:00:00Z')

    expect(isPast('2026-11-14T18:30:00', 'America/Chicago', now)).toBe(true)
    expect(isPast('2026-11-14T18:30:00', 'America/Los_Angeles', now)).toBe(false)
  })
})
