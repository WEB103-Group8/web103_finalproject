// this test checks that the Back button returns to the previous page
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BackButton from './BackButton'

describe('BackButton', () => {
  it('goes back to the page before', async () => {
    render(
      <MemoryRouter initialEntries={['/events', '/events/7']} initialIndex={1}>
        <Routes>
          <Route path="/events" element={<p>events list page</p>} />
          <Route path="/events/7" element={<BackButton />} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByText('events list page')).toBeInTheDocument()
  })
})
