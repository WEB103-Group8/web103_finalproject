import { useState } from 'react'
import { PAGE_SIZES } from '../utils/paginate'
import '../css/FilterBar.css'

// Return unique values from a list, sorted alphabetically.
const unique = (values) =>
  [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))

// A text field with a custom dropdown of suggestions.
// Typing filters the suggestions, but any text is allowed.
const SuggestField = ({
  id,
  label,
  value,
  options,
  onChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false)

  const query = value ?? ''

  // Filter suggestions based on what the user has typed.
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase())
  )

  const handlePick = (option) => {
    onChange(option)
    setOpen(false)
  }

  return (
    <div
      className={`filter-suggest ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
        }
      }}
    >
      <label htmlFor={id}>{label}</label>

      <input
        id={id}
        type="text"
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
          }

          if (event.key === 'Enter' && open) {
            setOpen(false)
          }
        }}
        aria-autocomplete="list"
        aria-expanded={open && filteredOptions.length > 0}
      />

      {open && filteredOptions.length > 0 && (
        <ul className="filter-suggest-list" role="listbox">
          {filteredOptions.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === query}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handlePick(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// The search and filter fields shared by the Events, Groups, and Welcome pages.
const FilterBar = ({
  filters,
  defaultFilters = {},
  categories,
  cities,
  suggestions,
  onSearchTyping,
  perPage,
  onPerPageChange,
  onApply,
  onClear,
  showPerPage = true,
}) => {
  const [draft, setDraft] = useState(filters)

  // Change one field of the draft.
  const setField = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }))
  }

  // Once a state or city is typed, only suggest matching cities and ZIP codes.
  const typedState = (draft.state ?? '').trim().toLowerCase()
  const typedCity = (draft.city ?? '').trim().toLowerCase()

  const inState = (place) =>
    !typedState || (place.state ?? '').toLowerCase() === typedState

  const inCity = (place) =>
    !typedCity || (place.city ?? '').toLowerCase() === typedCity

  const cityNames = unique(
    cities.filter(inState).map((place) => place.city)
  )

  const stateNames = unique(
    cities.map((place) => place.state)
  )

  const zipcodes = unique(
    cities
      .filter((place) => inState(place) && inCity(place))
      .map((place) => place.zipcode)
  )

  // Apply the draft filters.
  const handleSubmit = (event) => {
    event.preventDefault()
    onApply(draft)
  }

  // Go back to the filters the page starts with.
  const handleClear = () => {
    setDraft(defaultFilters)
    onSearchTyping('')
    onClear()
  }

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <SuggestField
        id="filter-q"
        label="Search Event or Group"
        className="wide"
        value={draft.q}
        options={suggestions}
        onChange={(value) => {
          setField('q', value)
          onSearchTyping(value)
        }}
      />

      <SuggestField
        id="filter-city"
        label="City"
        value={draft.city}
        options={cityNames}
        onChange={(value) => setField('city', value)}
      />

      <SuggestField
        id="filter-state"
        label="State"
        value={draft.state}
        options={stateNames}
        onChange={(value) => setField('state', value)}
      />

      <SuggestField
        id="filter-zipcode"
        label="Zip Code"
        value={draft.zipcode}
        options={zipcodes}
        onChange={(value) => setField('zipcode', value)}
      />

      <SuggestField
        id="filter-category"
        label="Category"
        value={draft.category}
        options={categories}
        onChange={(value) => setField('category', value)}
      />

      <label htmlFor="filter-from">
        From
        <input
          id="filter-from"
          type="date"
          value={draft.from ?? ''}
          onChange={(event) => setField('from', event.target.value)}
        />
      </label>

      <label htmlFor="filter-to">
        To
        <input
          id="filter-to"
          type="date"
          value={draft.to ?? ''}
          onChange={(event) => setField('to', event.target.value)}
        />
      </label>

      {/* Upcoming only and page size share one line. */}
      <div className="filter-inline">
        <label htmlFor="filter-upcoming" className="checkbox">
          <input
            id="filter-upcoming"
            type="checkbox"
            checked={draft.upcoming === 'true'}
            onChange={(event) =>
              setField('upcoming', event.target.checked ? 'true' : '')
            }
          />
          Upcoming only
        </label>

        {showPerPage && (
          <label htmlFor="filter-per-page">
            Items per page
            <select
              id="filter-per-page"
              value={perPage}
              onChange={(event) =>
                onPerPageChange(Number(event.target.value))
              }
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="filter-buttons">
        <button type="submit">Search</button>

        <button type="button" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  )
}

export default FilterBar
