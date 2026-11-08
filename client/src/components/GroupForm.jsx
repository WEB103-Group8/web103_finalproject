import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoryField from './CategoryField'
import ConfirmModal from './ConfirmModal'
import ErrorMessage from './ErrorMessage'
import FormField from './FormField'
import '../css/Forms.css'

// the form shared by creating and editing a group; the page decides what saving does
const GroupForm = ({ categories, initialValues, submitLabel, onSubmit }) => {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Cancel only needs an "are you sure?" when something was typed
  const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues)

  // change one field
  const setField = (name, value) => setValues({ ...values, [name]: value })

  // check what is missing here first, then let the server check the rest and show its answers next to the fields
  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const missing = {}
    if (!values.group_name.trim()) missing.group_name = 'Name is required.'
    if (!values.category.trim()) missing.category = 'Choose a category.'
    setErrors(missing)
    if (Object.keys(missing).length > 0) return

    setBusy(true)
    try {
      await onSubmit({ ...values, group_name: values.group_name.trim(), category: values.category.trim(), description: values.description.trim(), group_image_url: values.group_image_url.trim() })
    } catch (failure) {
      setErrors(failure.details ?? {})
      setFormError(failure.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField id="group_name" label="Name" error={errors.group_name}>
        <input id="group_name" value={values.group_name} aria-invalid={Boolean(errors.group_name)} onChange={(event) => setField('group_name', event.target.value)} />
      </FormField>

      <CategoryField id="category" value={values.category} categories={categories} onChange={(category) => setField('category', category)} error={errors.category} />

      <FormField id="description" label="Description (optional)" error={errors.description}>
        <textarea id="description" rows={4} value={values.description} onChange={(event) => setField('description', event.target.value)} />
      </FormField>

      <FormField id="group_image_url" label="Cover image URL (optional)" error={errors.group_image_url}>
        <input id="group_image_url" type="url" placeholder="https://" value={values.group_image_url} onChange={(event) => setField('group_image_url', event.target.value)} />
      </FormField>
      {values.group_image_url.trim() && <img className="form-preview" src={values.group_image_url.trim()} alt="Cover preview" />}

      {formError && <ErrorMessage message={formError} />}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {submitLabel}
        </button>
        <button type="button" className="secondary" onClick={() => (hasChanges ? setConfirmingDiscard(true) : navigate(-1))}>
          Cancel
        </button>
      </div>

      <ConfirmModal
        open={confirmingDiscard}
        title="Discard your changes?"
        message="What you typed will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => navigate(-1)}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </form>
  )
}

export default GroupForm
