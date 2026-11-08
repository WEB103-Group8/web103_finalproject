// these tests check the confirmation pop-up
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmModal from './ConfirmModal'

describe('ConfirmModal', () => {
  it('shows nothing while closed', () => {
    render(<ConfirmModal open={false} title="Delete event?" onConfirm={() => {}} onCancel={() => {}} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows the question and reports which button was pressed', async () => {
    const confirm = vi.fn()
    const cancel = vi.fn()
    render(<ConfirmModal open title="Delete event?" message="This cannot be undone." confirmLabel="Delete" onConfirm={confirm} onCancel={cancel} />)

    expect(screen.getByRole('alertdialog', { name: 'Delete event?' })).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(cancel).toHaveBeenCalledOnce()
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('can name its two buttons', async () => {
    render(<ConfirmModal open title="Leave?" confirmLabel="Leave group" cancelLabel="Stay" onConfirm={() => {}} onCancel={() => {}} />)

    expect(screen.getByRole('button', { name: 'Leave group' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument()
  })

  it('cancels when Escape is pressed', async () => {
    const cancel = vi.fn()
    render(<ConfirmModal open title="Delete event?" onConfirm={() => {}} onCancel={cancel} />)

    await userEvent.keyboard('{Escape}')

    expect(cancel).toHaveBeenCalledOnce()
  })
})
