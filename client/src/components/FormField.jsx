import '../css/Forms.css'

// one form field: its label, the input itself, and the problem with it when there is one
const FormField = ({ id, label, error, children }) => (
  <div className="form-field">
    <label htmlFor={id}>{label}</label>
    {children}
    {error && (
      <p id={`${id}-error`} className="field-error" role="alert">
        {error}
      </p>
    )}
  </div>
)

export default FormField
