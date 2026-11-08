// these tests check the pop-up messages: they appear, go away by themselves, and can be closed
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './ToastContext'
import ToastProvider from './ToastProvider'

// a page with a button that asks for a message
const Page = () => {
  const { notify } = useToast()

  return (
    <>
      <button type="button" onClick={() => notify('Event created.')}>
        make
      </button>
      <button type="button" onClick={() => notify('Group created.')}>
        make another
      </button>
    </>
  )
}

const renderPage = () =>
  render(
    <ToastProvider>
      <Page />
    </ToastProvider>,
  )

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a message when a page asks for one, in a region screen readers announce', async () => {
    renderPage()
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeEmptyDOMElement()

    await userEvent.click(screen.getByRole('button', { name: 'make' }))

    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveTextContent('Event created.')
  })

  it('shows several messages at once', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'make' }))
    await userEvent.click(screen.getByRole('button', { name: 'make another' }))

    expect(screen.getByText('Event created.')).toBeInTheDocument()
    expect(screen.getByText('Group created.')).toBeInTheDocument()
  })

  it('takes a message away by itself after a few seconds', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'make' }))

    act(() => vi.advanceTimersByTime(4100))

    expect(screen.queryByText('Event created.')).not.toBeInTheDocument()
  })

  it('takes a message away when it is dismissed', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'make' }))

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))

    expect(screen.queryByText('Event created.')).not.toBeInTheDocument()
  })
})

describe('useToast without a provider', () => {
  it('does nothing instead of failing', async () => {
    render(<Page />)

    await userEvent.click(screen.getByRole('button', { name: 'make' }))

    expect(screen.getByRole('button', { name: 'make' })).toBeInTheDocument()
  })
})
