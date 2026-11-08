import '../css/Pagination.css'

// the page numbers to show: the first, the last, and the pages around the current one
const visiblePages = (page, totalPages) =>
  [...new Set([1, page - 1, page, page + 1, totalPages])].filter((number) => number >= 1 && number <= totalPages).sort((a, b) => a - b)

// Previous, numbered pages and Next; nothing is shown when everything fits on one page
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  const numbers = visiblePages(page, totalPages)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>

      {numbers.map((number, index) => (
        <span key={number} className="pagination-item">
          {/* a gap in the numbers is shown as dots */}
          {index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">...</span>}
          <button type="button" aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)}>
            {number}
          </button>
        </span>
      ))}

      <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </nav>
  )
}

export default Pagination
