import { paginate } from '../utils/paginate'
import { useFilterBar } from '../utils/useFilterBar'
import { useLoad } from '../utils/useLoad'
import EmptyState from './EmptyState'
import ErrorMessage from './ErrorMessage'
import FilterBar from './FilterBar'
import Pagination from './Pagination'
import Spinner from './Spinner'
import '../css/ListBrowser.css'

// "Showing 3 events", or "Showing 13-24 of 321 events" when the list has more than one page
const describeCount = (total, page, perPage, noun) => {
  const plural = total === 1 ? noun : `${noun}s`
  if (total <= perPage) return `Showing ${total} ${plural}`

  const first = (page - 1) * perPage + 1
  return `Showing ${first}-${Math.min(page * perPage, total)} of ${total} ${plural}`
}

// a list page with the filter bar, the results in pages, and the page buttons; the same for events and groups
// with upcomingByDefault, "Upcoming only" starts switched on
const ListBrowser = ({ loadItems, upcomingByDefault = false, renderItem, getKey, noun }) => {
  const { filterKey, serverFilters, page, perPage, setPage, filterBarProps } = useFilterBar(upcomingByDefault)

  const { data: items, error, loading, reload } = useLoad(() => loadItems(serverFilters), [filterKey])

  const shown = items ? paginate(items, page, perPage) : null

  return (
    <div className="list-browser">
      {/* the key gives the form a fresh start whenever the applied filters change (for example the back button) */}
      <FilterBar key={filterKey} {...filterBarProps} />

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {items && items.length === 0 && <EmptyState title={`No ${noun}s match your filters`} message="Try a different search or clear the filters." />}
      {shown && items.length > 0 && (
        <>
          <p className="result-count">{describeCount(items.length, shown.page, perPage, noun)}</p>
          <div className="card-grid">
            {shown.items.map((item) => (
              <div key={getKey(item)}>{renderItem(item)}</div>
            ))}
          </div>
          <Pagination page={shown.page} totalPages={shown.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default ListBrowser
