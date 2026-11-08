import { toInstant } from './dates'

// the seconds in a minute, hour and day
const SECONDS = { minute: 60, hour: 3600, day: 86400 }

// say how long until an event starts, or that it is happening now or has ended: { state, text };
// the venue's time zone makes the count right for people in any time zone
export const describeCountdown = (startText, endText, now = Date.now(), timezone) => {
  const start = toInstant(startText, timezone)
  const end = endText ? toInstant(endText, timezone) : start

  if (now >= end) return { state: 'ended', text: 'This event has ended' }
  if (now >= start) return { state: 'live', text: 'Happening now' }

  const total = Math.floor((start - now) / 1000)
  const parts = [
    [Math.floor(total / SECONDS.day), 'd'],
    [Math.floor((total % SECONDS.day) / SECONDS.hour), 'h'],
    [Math.floor((total % SECONDS.hour) / SECONDS.minute), 'm'],
    [total % SECONDS.minute, 's'],
  ]

  // leave out the empty units at the front, such as "0d" when the event is tomorrow
  const first = parts.findIndex(([value]) => value > 0)
  const shown = parts.slice(first === -1 ? parts.length - 1 : first)

  return { state: 'upcoming', text: `Starts in ${shown.map(([value, unit]) => `${value}${unit}`).join(' ')}` }
}
