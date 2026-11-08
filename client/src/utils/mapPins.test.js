// these tests check that every event keeps its own clickable pin, even when events share a venue
import { describe, expect, it } from 'vitest'
import { spreadPins } from './mapPins'

const pin = (id, latitude, longitude) => ({ event_id: id, latitude, longitude })

describe('spreadPins', () => {
  it('leaves pins that are alone exactly where they are', () => {
    const [first, second] = spreadPins([pin(1, 30.1, -97.1), pin(2, 40.2, -80.2)])

    expect(first.position).toEqual([30.1, -97.1])
    expect(second.position).toEqual([40.2, -80.2])
  })

  it('gives events at the same spot different positions that stay very close to it', () => {
    const spread = spreadPins([pin(1, 30, -97), pin(2, 30, -97), pin(3, 30, -97)])
    const positions = new Set(spread.map((item) => item.position.join(',')))

    expect(positions.size).toBe(3)
    for (const item of spread) {
      expect(Math.abs(item.position[0] - 30)).toBeLessThan(0.001)
      expect(Math.abs(item.position[1] + 97)).toBeLessThan(0.001)
    }
  })

  it('puts the same event in the same place every time, whatever order the list comes in', () => {
    const forward = spreadPins([pin(1, 30, -97), pin(2, 30, -97)])
    const backward = spreadPins([pin(2, 30, -97), pin(1, 30, -97)])

    expect(forward.find((item) => item.event_id === 2).position).toEqual(backward.find((item) => item.event_id === 2).position)
  })

  it('keeps every other field of the pin and gives nothing for no pins', () => {
    expect(spreadPins([{ event_id: 1, event_title: 'Jam', latitude: 1, longitude: 2 }])[0].event_title).toBe('Jam')
    expect(spreadPins([])).toEqual([])
  })
})
