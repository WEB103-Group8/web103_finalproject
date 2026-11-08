// these tests check how filters and paging move between the page address and the page
import { describe, expect, it } from 'vitest'
import { readFilters, readPaging, writeFilters, writeListParams } from './filterParams'

describe('readFilters', () => {
  it('reads the known filters and ignores everything else', () => {
    const params = new URLSearchParams('state=TX&q=jazz&page=3&category=')

    expect(readFilters(params)).toEqual({ state: 'TX', q: 'jazz' })
  })

  it('gives nothing for an empty address', () => {
    expect(readFilters(new URLSearchParams(''))).toEqual({})
  })
})

describe('writeFilters', () => {
  it('writes only the filters that have a value, in the order the form shows them, and encodes them', () => {
    expect(writeFilters({ state: 'TX', q: 'code & coffee', city: 'Austin', other: 'x', category: '' }).toString()).toBe('q=code+%26+coffee&city=Austin&state=TX')
  })

  it('round-trips with readFilters', () => {
    const filters = { q: 'jazz', state: 'TX', upcoming: 'true' }

    expect(readFilters(writeFilters(filters))).toEqual(filters)
  })
})

describe('readPaging', () => {
  it('reads the page and the items per page', () => {
    expect(readPaging(new URLSearchParams('page=3&perPage=20'))).toEqual({ page: 3, perPage: 20 })
  })

  it('falls back to the first page and the default size for anything unusable', () => {
    expect(readPaging(new URLSearchParams(''))).toEqual({ page: 1, perPage: 10 })
    expect(readPaging(new URLSearchParams('page=abc&perPage=7'))).toEqual({ page: 1, perPage: 10 })
    expect(readPaging(new URLSearchParams('page=-2&perPage=1000'))).toEqual({ page: 1, perPage: 10 })
  })
})

describe('writeListParams', () => {
  it('leaves out the first page and the default size', () => {
    expect(writeListParams({ city: 'Austin' }, { page: 1, perPage: 10 }).toString()).toBe('city=Austin')
  })

  it('writes the page and a size that is not the default', () => {
    expect(writeListParams({ city: 'Austin' }, { page: 3, perPage: 20 }).toString()).toBe('city=Austin&perPage=20&page=3')
  })
})
