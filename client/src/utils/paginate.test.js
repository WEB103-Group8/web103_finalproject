// these tests check how a long list is cut into pages
import { describe, expect, it } from 'vitest'
import { paginate } from './paginate'

const items = Array.from({ length: 25 }, (_, index) => index + 1)

describe('paginate', () => {
  it('gives the items of the asked page and the number of pages', () => {
    expect(paginate(items, 2, 10)).toEqual({ items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], page: 2, totalPages: 3 })
  })

  it('gives a shorter last page', () => {
    expect(paginate(items, 3, 10).items).toEqual([21, 22, 23, 24, 25])
  })

  it('moves a page number that is too high or too low to the nearest real page', () => {
    expect(paginate(items, 99, 10).page).toBe(3)
    expect(paginate(items, 0, 10).page).toBe(1)
  })

  it('still has one empty page for an empty list', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, totalPages: 1 })
  })
})
