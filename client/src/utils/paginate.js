// the choices for "items per page", and the one used until the person picks another
export const PAGE_SIZES = [10, 20, 30, 40, 50]
export const DEFAULT_PER_PAGE = 10

// cut a list into pages: gives the items of one page, the page number actually shown and how many pages there are
export const paginate = (items, page, perPage) => {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage

  return { items: items.slice(start, start + perPage), page: current, totalPages }
}
