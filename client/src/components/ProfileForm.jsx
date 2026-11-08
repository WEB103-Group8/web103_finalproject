import { useState } from 'react'
import ErrorMessage from './ErrorMessage'
import FormField from './FormField'
import '../css/Forms.css'

// the fields a person can change about themself, in the order shown
const FIELDS = [
  ['full_name', 'Full name'],
  ['city', 'City'],
  ['state', 'State'],
  ['country', 'Country'],
  ['zipcode', 'ZIP code'],
]

// the form for editing your own profile; states that have events on Orbit are suggested, but the server has the final say
const ProfileForm = ({ profile, states, onSave }) => {
  const [values, setValues] = useState(() => ({
    full_name: profile.full_name ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    country: profile.country ?? '',
    zipcode: profile.zipcode ?? '',
    user_image_url: profile.user_image_url ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  // change one field
  const setField = (name, value) => setValues({ ...values, [name]: value })

  // check the two fields that cannot be empty, then save and show what the server says
  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const missing = {}
    if (!values.full_name.trim()) missing.full_name = 'Name is required.'
    if (!values.city.trim()) missing.city = 'City is required.'
    setErrors(missing)
    if (Object.keys(missing).length > 0) return

    setBusy(true)
    try {
      await onSave(values)
    } catch (failure) {
      setErrors(failure.details ?? {})
      setFormError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {FIELDS.map(([name, label]) => (
        <FormField key={name} id={name} label={label} error={errors[name]}>
          <input
            id={name}
            list={name === 'state' ? 'profile-state-options' : undefined}
            autoComplete="off"
            value={values[name]}
            aria-invalid={Boolean(errors[name])}
            onChange={(event) => setField(name, event.target.value)}
          />
        </FormField>
      ))}
      <datalist id="profile-state-options">
        {states.map((state) => (
          <option key={state} value={state} />
        ))}
      </datalist>

      <FormField id="user_image_url" label="Photo URL (optional)" error={errors.user_image_url}>
        <input id="user_image_url" type="url" placeholder="https://" value={values.user_image_url} onChange={(event) => setField('user_image_url', event.target.value)} />
      </FormField>
      {values.user_image_url.trim() && <img className="form-preview" src={values.user_image_url.trim()} alt="Photo preview" />}

      {formError && <ErrorMessage message={formError} />}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          Save profile
        </button>
      </div>
    </form>
  )
}

export default ProfileForm
