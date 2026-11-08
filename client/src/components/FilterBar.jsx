import { useState } from 'react'
import { PAGE_SIZES } from '../utils/paginate'
import '../css/FilterBar.css'

// the unique values of a list, sorted, for the suggestion lists
const unique = (values) => [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))

// one text field with a suggestion list: typing shows matching suggestions, but any text is allowed
const SuggestField = ({ id, label, value, options, onChange, className }) => (
  <label htmlFor={id} className={className}>
    {label}
    <input id={id} list={`${id}-options`} autoComplete="off" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    <datalist id={`${id}-options`}>
      {options.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  </label>
)

// the search and filter fields, the same on every page that has them; nothing is applied until the person presses Search
const FilterBar = ({ filters, defaultFilters = {}, categories, cities, suggestions, onSearchTyping, perPage, onPerPageChange, onApply, onClear, showPerPage = true }) => {
  const [draft, setDraft] = useState(filters)

  // change one field of the draft
  const setField = (name, value) => setDraft({ ...draft, [name]: value })

  // once a state or city is typed, only suggest the cities and zip codes that fit it
  const typedState = (draft.state ?? '').trim().toLowerCase()
  const typedCity = (draft.city ?? '').trim().toLowerCase()
  const inState = (place) => !typedState || place.state.toLowerCase() === typedState
  const inCity = (place) => !typedCity || place.city.toLowerCase() === typedCity
  const cityNames = unique(cities.filter(inState).map((place) => place.city))
  const stateNames = unique(cities.map((place) => place.state))
  const zipcodes = unique(cities.filter((place) => inState(place) && inCity(place)).map((place) => place.zipcode))

  // apply the draft filters
  const handleSubmit = (event) => {
    event.preventDefault()
    onApply(draft)
  }

  // go back to the filters the page starts with
  const handleClear = () => {
    setDraft(defaultFilters)
    onClear()
  }

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <label htmlFor="filter-q" className="wide">
        Search Event or Group
        <input
          id="filter-q"
          type="search"
          list="filter-q-options"
          autoComplete="off"
          value={draft.q ?? ''}
          onChange={(event) => {
            setField('q', event.target.value)
            onSearchTyping(event.target.value)
          }}
        />
        <datalist id="filter-q-options">
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>

      <SuggestField id="filter-city" label="City" value={draft.city} options={cityNames} onChange={(value) => setField('city', value)} />
      <SuggestField id="filter-state" label="State" value={draft.state} options={stateNames} onChange={(value) => setField('state', value)} />
      <SuggestField id="filter-zipcode" label="Zip Code" value={draft.zipcode} options={zipcodes} onChange={(value) => setField('zipcode', value)} />
      <SuggestField id="filter-category" label="Category" value={draft.category} options={categories} onChange={(value) => setField('category', value)} />

      <label htmlFor="filter-from">
        From
        <input id="filter-from" type="date" value={draft.from ?? ''} onChange={(event) => setField('from', event.target.value)} />
      </label>
      <label htmlFor="filter-to">
        To
        <input id="filter-to" type="date" value={draft.to ?? ''} onChange={(event) => setField('to', event.target.value)} />
      </label>

      {/* "Upcoming only" and the page size share one line */}
      <div className="filter-inline">
        <label htmlFor="filter-upcoming" className="checkbox">
          <input
            id="filter-upcoming"
            type="checkbox"
            checked={draft.upcoming === 'true'}
            onChange={(event) => setField('upcoming', event.target.checked ? 'true' : '')}
          />
          Upcoming only
        </label>

        {showPerPage && (
          <label htmlFor="filter-per-page">
            Items per page
            <select id="filter-per-page" value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))}>
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
