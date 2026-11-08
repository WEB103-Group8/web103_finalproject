// the clock time of a date as "6:30 PM"
const clockTime = (date) => {
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`
}

// how far a time zone is from UTC (in minutes) at one moment, which changes when the clocks change
const offsetMinutes = (instant, timeZone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  )
  const shownAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))

  return (shownAsUtc - Math.floor(instant / 1000) * 1000) / 60000
}

// the exact moment of an event time such as "2026-11-14T18:30:00", which is the clock time at the venue (in the venue's time zone);
// without a time zone it is read as a time on this computer's clock
export const toInstant = (text, timezone) => {
  if (!timezone) return new Date(text).getTime()

  const clockAsUtc = Date.parse(`${text}Z`)
  const guess = clockAsUtc - offsetMinutes(clockAsUtc, timezone) * 60000

  // look again at the guessed moment, in case the clocks changed in between
  return clockAsUtc - offsetMinutes(guess, timezone) * 60000
}

// the short name of a time zone at the time of an event, such as "CST" or "CDT"; nothing when there is no usable time zone
const zoneName = (text, timezone) => {
  if (!timezone) return null

  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(new Date(toInstant(text, timezone)))
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? null
  } catch {
    return null
  }
}

// add the time zone name after a time label, when there is one
const withZone = (label, text, timezone) => {
  const zone = zoneName(text, timezone)
  return zone ? `${label} ${zone}` : label
}

// "Sat, Nov 14 - 6:30 PM", exactly as the venue's clock gave it (no time zone shifting)
const dayAndClock = (text) => {
  const date = new Date(text)
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return `${day} - ${clockTime(date)}`
}

// show a start time such as "Sat, Nov 14 - 6:30 PM CST", with the time zone of the venue when it is known
export const formatEventTime = (text, timezone) => withZone(dayAndClock(text), text, timezone)

// show when an event starts and ends: "Sat, Nov 14 - 6:30 PM to 8:00 PM CST", or with the end date when it ends on another day
export const formatEventRange = (startText, endText, timezone) => {
  if (!endText) return formatEventTime(startText, timezone)

  const start = new Date(startText)
  const end = new Date(endText)
  const endsSameDay = start.toDateString() === end.toDateString()

  return withZone(`${dayAndClock(startText)} to ${endsSameDay ? clockTime(end) : dayAndClock(endText)}`, endText, timezone)
}

// true when the time has already passed; the time zone makes it right for viewers anywhere, and now can be given so tests control the clock
export const isPast = (text, timezone, now = Date.now()) => toInstant(text, timezone) < now
