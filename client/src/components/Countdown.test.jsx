// this test checks that the countdown keeps moving by itself and changes when the event starts and ends
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Countdown from './Countdown'

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-14T17:59:55') })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Countdown', () => {
  it('counts down each second, then says the event is happening, then that it has ended', () => {
    render(<Countdown start="2026-11-14T18:00:00" end="2026-11-14T18:00:10" />)

    expect(screen.getByText('Starts in 5s')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByText('Starts in 2s')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('Happening now')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText('This event has ended')).toBeInTheDocument()
  })
})
