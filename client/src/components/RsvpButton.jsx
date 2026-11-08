import '../css/RsvpButton.css'

// the RSVP choice; the page works out the situation, this only decides what to show
const RsvpButton = ({ isAttending = false, isFull = false, hasStarted = false, busy = false, onAttend, onNotAttend }) => {
  // nothing can change once the event has started
  if (hasStarted) {
    return (
      <div className="rsvp-button">
        <button type="button" disabled>
          Event has started
        </button>
      </div>
    )
  }

  // someone who is going can say they are not; anyone else can join unless the event is full
  return (
    <div className="rsvp-button">
      {isAttending ? (
        <button type="button" disabled={busy} onClick={onNotAttend}>
          Not attending
        </button>
      ) : (
        <button type="button" disabled={busy || isFull} onClick={onAttend}>
          {isFull ? 'Event is full' : 'Attend'}
        </button>
      )}
    </div>
  )
}

export default RsvpButton
