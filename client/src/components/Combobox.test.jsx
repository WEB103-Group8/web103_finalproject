// these tests check the dropdown text box used for groups, categories and venues
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Combobox from './Combobox'

// draw the box with a typed text the test can see change
const Harness = ({ options = [{ key: 1, label: 'Alpha' }, { key: 2, label: 'Beta' }], onPick = () => {}, onAdd = () => {}, addDisabled = false }) => {
  const [query, setQuery] = useState('')

  return (
    <Combobox id="thing" label="Thing" query={query} onQueryChange={setQuery} options={options} emptyText="Nothing found." onPick={onPick} addLabel="+ Add Thing" addDisabled={addDisabled} onAdd={onAdd} listLabel="Thing results" />
  )
}

describe('Combobox', () => {
  it('is closed until the box is clicked, then lists the options with the add choice last', async () => {
    render(<Harness />)
    expect(screen.queryByRole('list', { name: 'Thing results' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Thing'))

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Alpha', 'Beta', '+ Add Thing'])
  })

  it('reports what is typed and opens the list while typing', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Thing'), 'al')

    expect(screen.getByLabelText('Thing')).toHaveValue('al')
    expect(screen.getByRole('list', { name: 'Thing results' })).toBeInTheDocument()
  })

  it('tells the page which option was picked and closes the list', async () => {
    const pick = vi.fn()
    render(<Harness onPick={pick} />)

    await userEvent.click(screen.getByLabelText('Thing'))
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }))

    expect(pick).toHaveBeenCalledWith({ key: 2, label: 'Beta' })
    expect(screen.queryByRole('list', { name: 'Thing results' })).not.toBeInTheDocument()
  })

  it('says so when there are no options, and still offers the add choice', async () => {
    render(<Harness options={[]} />)

    await userEvent.click(screen.getByLabelText('Thing'))

    expect(screen.getByText('Nothing found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add Thing' })).toBeInTheDocument()
  })

  it('runs the add choice and closes the list', async () => {
    const add = vi.fn()
    render(<Harness onAdd={add} />)

    await userEvent.click(screen.getByLabelText('Thing'))
    await userEvent.click(screen.getByRole('button', { name: '+ Add Thing' }))

    expect(add).toHaveBeenCalledOnce()
    expect(screen.queryByRole('list', { name: 'Thing results' })).not.toBeInTheDocument()
  })

  it('can disable the add choice, and closes with Escape', async () => {
    render(<Harness addDisabled />)

    await userEvent.click(screen.getByLabelText('Thing'))
    expect(screen.getByRole('button', { name: '+ Add Thing' })).toBeDisabled()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('list', { name: 'Thing results' })).not.toBeInTheDocument()
  })
})
