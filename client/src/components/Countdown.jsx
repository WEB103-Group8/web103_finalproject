import { describeCountdown } from '../utils/countdown'
import { useNow } from '../utils/useNow'
import '../css/Countdown.css'

// a live countdown to when an event starts
const Countdown = ({ start, end, timezone }) => {
  const now = useNow()
  const { state, text } = describeCountdown(start, end, now, timezone)

  return <p className={`countdown ${state}`}>{text}</p>
}

export default Countdown
