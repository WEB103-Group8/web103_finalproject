// these tests check which RSVP choice a person sees in each situation
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RsvpButton from './RsvpButton'

// draw the button with handlers the test can watch
const renderButton = (props) => {
  const handlers = { onAttend: vi.fn(), onNotAttend: vi.fn() }
  render(<RsvpButton {...handlers} {...props} />)
  return handlers
}

describe('RsvpButton', () => {
  it('offers Attend to someone who is not going, and nothing else', async () => {
    const { onAttend } = renderButton({})

    await userEvent.click(screen.getByRole('button', { name: 'Attend' }))

    expect(onAttend).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('disables Attend with a reason when the event is full', () => {
    renderButton({ isFull: true })

    expect(screen.getByRole('button', { name: 'Event is full' })).toBeDisabled()
  })

  it('offers Not attending to someone who is going, and no cancel button', async () => {
    const { onNotAttend } = renderButton({ isAttending: true })

    await userEvent.click(screen.getByRole('button', { name: 'Not attending' }))

    expect(onNotAttend).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('does not call a full event full for someone who is already going', () => {
    renderButton({ isAttending: true, isFull: true })

    expect(screen.getByRole('button', { name: 'Not attending' })).toBeEnabled()
  })

  it('blocks changing the answer once the event has started', () => {
    renderButton({ isAttending: true, hasStarted: true })

    expect(screen.getByRole('button', { name: 'Event has started' })).toBeDisabled()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('disables the button while a request is running', () => {
    renderButton({ isAttending: true, busy: true })

    expect(screen.getByRole('button', { name: 'Not attending' })).toBeDisabled()
  })
})
