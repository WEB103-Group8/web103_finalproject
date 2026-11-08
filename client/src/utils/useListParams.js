import { useSearchParams } from 'react-router-dom'
import { readFilters, readPaging, writeListParams } from './filterParams'

// the filters, page and items per page of a list page, kept in the address so links, refresh and the back button all work
export const useListParams = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const { page, perPage } = readPaging(searchParams)

  return {
    filters,
    page,
    perPage,
    // new filters start again from the first page
    applyFilters: (newFilters) => setSearchParams(writeListParams(newFilters, { page: 1, perPage })),
    setPage: (newPage) => setSearchParams(writeListParams(filters, { page: newPage, perPage })),
    // a new page size also starts again from the first page
    setPerPage: (newPerPage) => setSearchParams(writeListParams(filters, { page: 1, perPage: newPerPage })),
  }
}
