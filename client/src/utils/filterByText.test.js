// these tests check the relative search used by the dropdowns
import { describe, expect, it } from 'vitest'
import { filterByText } from './filterByText'

const groups = [{ name: 'Austin Code & Coffee' }, { name: 'Sketch & Sip' }, { name: 'Coffee Roasters' }]

describe('filterByText', () => {
  it('keeps everything when nothing is typed', () => {
    expect(filterByText(groups, '  ', (group) => group.name)).toHaveLength(3)
  })

  it('matches part of a word, ignoring capital letters', () => {
    expect(filterByText(groups, 'COF', (group) => group.name).map((group) => group.name)).toEqual(['Austin Code & Coffee', 'Coffee Roasters'])
  })

  it('needs every typed word, in any order', () => {
    expect(filterByText(groups, 'coffee austin', (group) => group.name).map((group) => group.name)).toEqual(['Austin Code & Coffee'])
  })

  it('works on plain words and finds nothing when nothing matches', () => {
    expect(filterByText(['Food', 'Technology'], 'tech')).toEqual(['Technology'])
    expect(filterByText(['Food'], 'zzz')).toEqual([])
  })
})
