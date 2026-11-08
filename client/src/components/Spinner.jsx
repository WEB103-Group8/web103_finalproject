import '../css/Feedback.css'

// a spinning wheel shown while a page is waiting for the server (the word "Loading" is there for screen readers)
const Spinner = () => (
  <div className="spinner" role="status">
    <span className="spinner-wheel" aria-hidden="true" />
    <span className="spinner-label">Loading...</span>
  </div>
)

export default Spinner
