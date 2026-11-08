import { useEffect, useState } from 'react'

// the current time in milliseconds, refreshed every so often so a countdown keeps moving
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
