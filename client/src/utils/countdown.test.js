// these tests check the words shown while counting down to an event
import { describe, expect, it } from 'vitest'
import { describeCountdown } from './countdown'

const start = '2026-11-14T18:00:00'
const end = '2026-11-14T20:00:00'
const at = (text) => new Date(text).getTime()

describe('describeCountdown', () => {
  it('counts down in days, hours, minutes and seconds', () => {
    expect(describeCountdown(start, end, at('2026-11-11T13:28:50'))).toEqual({ state: 'upcoming', text: 'Starts in 3d 4h 31m 10s' })
  })

  it('leaves out the empty units at the front', () => {
    expect(describeCountdown(start, end, at('2026-11-14T15:30:00')).text).toBe('Starts in 2h 30m 0s')
    expect(describeCountdown(start, end, at('2026-11-14T17:59:30')).text).toBe('Starts in 30s')
  })

  it('says the event is happening now between its start and its end', () => {
    expect(describeCountdown(start, end, at('2026-11-14T18:00:00'))).toEqual({ state: 'live', text: 'Happening now' })
    expect(describeCountdown(start, end, at('2026-11-14T19:59:59')).state).toBe('live')
  })

  it('says the event has ended once its end time has passed', () => {
    expect(describeCountdown(start, end, at('2026-11-14T20:00:00'))).toEqual({ state: 'ended', text: 'This event has ended' })
  })

  it('treats an event without an end time as ending when it starts', () => {
    expect(describeCountdown(start, null, at('2026-11-14T18:00:00')).state).toBe('ended')
  })
})

describe('describeCountdown with the venue\'s time zone', () => {
  it('counts to the exact moment the event starts, not to the same clock time on the viewer\'s computer', () => {
    // 6:00 PM in Chicago in November is midnight UTC
    const now = Date.parse('2026-11-14T22:00:00Z')

    expect(describeCountdown('2026-11-14T18:00:00', '2026-11-14T20:00:00', now, 'America/Chicago').text).toBe('Starts in 2h 0m 0s')
  })

  it('says happening now and ended by the venue\'s clock', () => {
    const during = Date.parse('2026-11-15T01:00:00Z')
    const after = Date.parse('2026-11-15T03:00:00Z')

    expect(describeCountdown('2026-11-14T18:00:00', '2026-11-14T20:00:00', during, 'America/Chicago').state).toBe('live')
    expect(describeCountdown('2026-11-14T18:00:00', '2026-11-14T20:00:00', after, 'America/Chicago').state).toBe('ended')
  })
})
