// these tests check the event map: one pin per event, hovering, clicking and the highlighted pin
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EventMap from './EventMap'

const pins = [
  { event_id: 1, event_title: 'Open Source Saturday', start_time: '2026-11-14T18:30:00', category: 'Technology', latitude: 30.1, longitude: -97.1, rsvp_count: 3 },
  { event_id: 2, event_title: 'Open Studio Evening', start_time: '2026-11-15T19:00:00', category: 'Arts', latitude: 32.7, longitude: -96.8, rsvp_count: 8 },
  // the same venue as event 2
  { event_id: 3, event_title: 'Pottery Night', start_time: '2026-11-16T19:00:00', category: 'Arts', latitude: 32.7, longitude: -96.8, rsvp_count: 1 },
]

// draw the map and give back the pins that were drawn
const renderMap = (props = {}) => {
  const handlers = { onHover: vi.fn(), onSelect: vi.fn() }
  const { container } = render(<EventMap pins={pins} activeId={null} {...handlers} {...props} />)
  return { ...handlers, icons: () => [...container.querySelectorAll('.leaflet-marker-icon')] }
}

describe('EventMap', () => {
  it('draws exactly one pin for every event, even when events share a venue', () => {
    const { icons } = renderMap()

    expect(icons()).toHaveLength(3)
  })

  it('draws no pins for no events', () => {
    const { icons } = renderMap({ pins: [] })

    expect(icons()).toHaveLength(0)
  })

  it('draws small pins, so many events fit on the map', () => {
    const { icons } = renderMap()

    expect(Number.parseInt(icons()[0].style.width, 10)).toBeLessThanOrEqual(14)
    expect(Number.parseInt(icons()[0].style.height, 10)).toBeLessThanOrEqual(22)
  })

  it('tells the page which event was clicked', () => {
    const { icons, onSelect } = renderMap()

    fireEvent.click(icons()[1])

    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('tells the page which event is hovered, and when the mouse leaves', () => {
    const { icons, onHover } = renderMap()

    fireEvent.mouseOver(icons()[0])
    fireEvent.mouseOut(icons()[0])

    expect(onHover.mock.calls).toEqual([[1], [null]])
  })

  it('shows a tooltip with the title, time and category when a pin is hovered', () => {
    const { icons } = renderMap()

    fireEvent.mouseOver(icons()[0])

    expect(screen.getByText('Open Source Saturday')).toBeInTheDocument()
    expect(screen.getByText(/Sat, Nov 14 - 6:30 PM/)).toBeInTheDocument()
    expect(screen.getByText(/Technology/)).toBeInTheDocument()
  })

  it('shows the time zone in the tooltip when the pin has one', () => {
    const { icons } = renderMap({ pins: [{ ...pins[0], timezone: 'America/Chicago' }] })

    fireEvent.mouseOver(icons()[0])

    expect(screen.getByText(/Sat, Nov 14 - 6:30 PM CST/)).toBeInTheDocument()
  })

  it('makes only the active event pin stand out', () => {
    const { icons } = renderMap({ activeId: 2 })

    expect(icons().filter((icon) => icon.classList.contains('pin-active'))).toHaveLength(1)
  })
})
