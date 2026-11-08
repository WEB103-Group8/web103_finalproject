import '../css/Feedback.css'

// a friendly error, with a retry button when the page can try again
const ErrorMessage = ({ message, onRetry }) => (
  <div className="error-message" role="alert">
    <p>{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
)

export default ErrorMessage
