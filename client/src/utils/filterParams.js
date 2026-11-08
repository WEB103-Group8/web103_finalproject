import { DEFAULT_PER_PAGE, PAGE_SIZES } from './paginate'

// the filters a page can keep in its address, such as /events?state=TX&category=Food
const FILTER_NAMES = ['q', 'city', 'state', 'zipcode', 'category', 'from', 'to', 'upcoming']

// read the filters out of the address, ignoring anything that is not a filter
export const readFilters = (searchParams) => {
  const filters = {}

  for (const name of FILTER_NAMES) {
    const value = searchParams.get(name)
    if (value) filters[name] = value
  }

  return filters
}

// turn filters into address parameters, leaving out empty ones
export const writeFilters = (filters) => {
  const params = new URLSearchParams()

  for (const name of FILTER_NAMES) {
    if (filters[name]) params.set(name, filters[name])
  }

  return params
}

// read the page number and the items per page; anything unusable falls back to the first page and the default size
export const readPaging = (searchParams) => {
  const page = Number(searchParams.get('page'))
  const perPage = Number(searchParams.get('perPage'))

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    perPage: PAGE_SIZES.includes(perPage) ? perPage : DEFAULT_PER_PAGE,
  }
}

// filters plus paging as address parameters; the first page and the default size are left out to keep addresses short
export const writeListParams = (filters, { page, perPage }) => {
  const params = writeFilters(filters)

  if (perPage !== DEFAULT_PER_PAGE) params.set('perPage', perPage)
  if (page > 1) params.set('page', page)

  return params
}
