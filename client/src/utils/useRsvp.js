import { useState } from 'react'
import RsvpsAPI from '../services/RsvpsAPI'

// the RSVP of the logged-in person for one event, shared by the event page and the map panel:
// answers show straight away and are put back if the server says no; each action says whether it worked
export const useRsvp = (event, statuses) => {
  // the person's answer as they changed it here; until they change it, the server's answer is used
  const [answer, setAnswer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  const hasRsvp = answer ? answer.hasRsvp : event.my_rsvp !== null
  const isAttending = answer ? answer.isAttending : event.is_attending

  // everyone else's count stays as the server gave it; only the person's own answer changes it
  const attendingCount = event.rsvp_count - (event.is_attending ? 1 : 0) + (isAttending ? 1 : 0)

  // show the new answer straight away, ask the server, and put the old answer back if the server says no
  const change = async (next, ask) => {
    const before = answer
    setAnswer(next)
    setBusy(true)
    setProblem(null)

    try {
      await ask()
      return true
    } catch (error) {
      setAnswer(before)
      setProblem(error.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const attend = () =>
    change({ hasRsvp: true, isAttending: true }, () => (hasRsvp ? RsvpsAPI.changeRsvp(event.event_id, statuses.attending) : RsvpsAPI.joinEvent(event.event_id)))
  const notAttend = () => change({ hasRsvp: true, isAttending: false }, () => RsvpsAPI.changeRsvp(event.event_id, statuses.notAttending))

  return {
    isAttending,
    attendingCount,
    isFull: !isAttending && attendingCount >= event.capacity,
    // nothing can be changed until the answer words are known
    busy: busy || !statuses,
    problem,
    attend,
    notAttend,
  }
}
