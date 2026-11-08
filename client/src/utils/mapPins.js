// how far apart (in degrees, about 30 metres) pins that share one spot are spread, and how much each extra pin adds
const BASE_SPREAD = 0.0003
const SPREAD_PER_PIN = 0.0001

// give every pin a map position; pins at exactly the same spot are put on a small circle around it so each one can still be clicked
export const spreadPins = (pins) => {
  const bySpot = new Map()

  for (const pin of pins) {
    const spot = `${pin.latitude},${pin.longitude}`
    bySpot.set(spot, [...(bySpot.get(spot) ?? []), pin])
  }

  return pins.map((pin) => {
    const sharing = bySpot.get(`${pin.latitude},${pin.longitude}`)
    if (sharing.length === 1) return { ...pin, position: [pin.latitude, pin.longitude] }

    // the same order every time, so a pin never jumps around between draws
    const ordered = [...sharing].sort((a, b) => a.event_id - b.event_id)
    const angle = (2 * Math.PI * ordered.indexOf(pin)) / ordered.length
    const radius = BASE_SPREAD + SPREAD_PER_PIN * ordered.length

    return { ...pin, position: [pin.latitude + radius * Math.sin(angle), pin.longitude + radius * Math.cos(angle)] }
  })
}
