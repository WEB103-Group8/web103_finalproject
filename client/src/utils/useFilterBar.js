import { useEffect, useState } from 'react'
import CategoriesAPI from '../services/CategoriesAPI'
import CitiesAPI from '../services/CitiesAPI'
import { writeFilters } from './filterParams'
import { loadSearchSuggestions } from './suggestions'
import { useListParams } from './useListParams'
import { useLoad } from './useLoad'

// suggestions start after this many typed letters, and wait this long (in milliseconds) after the last key
const MIN_SUGGEST_LETTERS = 2
const SUGGEST_DELAY_MS = 250

// everything a page needs to run the filter bar: the filters in the address, the page, the suggestion lists, and the props for the bar itself;
// with upcomingByDefault, "Upcoming only" starts switched on and the address says upcoming=false when the person switches it off
export const useFilterBar = (upcomingByDefault = false) => {
  const { filters, page, perPage, applyFilters, setPage, setPerPage } = useListParams()
  const defaultFilters = upcomingByDefault ? { upcoming: 'true' } : {}

  // the filters in effect: the address, or the page's starting filters when the address says nothing about them
  const shownFilters = filters.upcoming === undefined ? { ...defaultFilters, ...filters } : filters
  const filterKey = writeFilters(shownFilters).toString()

  // the server only needs to hear about "Upcoming only" when it is on
  const serverFilters = { ...shownFilters }
  if (serverFilters.upcoming !== 'true') delete serverFilters.upcoming

  // when the page starts with upcoming on, switching it off has to be written in the address
  const apply = (draft) => applyFilters(upcomingByDefault && draft.upcoming !== 'true' ? { ...draft, upcoming: 'false' } : draft)

  // the suggestion lists; if they cannot be loaded the page still works without them
  const { data: categories } = useLoad(() => CategoriesAPI.getCategories().catch(() => []))
  const { data: cities } = useLoad(() => CitiesAPI.getCities().catch(() => []))

  // suggestions for the search box appear a moment after the person stops typing
  const [typed, setTyped] = useState('')
  const [found, setFound] = useState([])
  const typedText = typed.trim()

  useEffect(() => {
    if (typedText.length < MIN_SUGGEST_LETTERS) return undefined

    let active = true
    const timer = setTimeout(() => {
      loadSearchSuggestions(typedText)
        .then((names) => active && setFound(names))
        .catch(() => active && setFound([]))
    }, SUGGEST_DELAY_MS)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [typedText])

  return {
    filterKey,
    serverFilters,
    page,
    perPage,
    setPage,
    filterBarProps: {
      filters: shownFilters,
      defaultFilters,
      categories: categories ?? [],
      cities: cities ?? [],
      suggestions: typedText.length >= MIN_SUGGEST_LETTERS ? found : [],
      onSearchTyping: setTyped,
      perPage,
      onPerPageChange: setPerPage,
      onApply: apply,
      onClear: () => applyFilters({}),
    },
  }
}
