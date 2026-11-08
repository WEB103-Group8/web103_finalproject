import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import GroupsAPI from '../services/GroupsAPI'
import CategoryField from './CategoryField'
import ErrorMessage from './ErrorMessage'
import FormField from './FormField'
import '../css/Forms.css'

// a small box inside the event form for adding a group without leaving the page
const GroupQuickAdd = ({ initialName = '', categories, onCreated, onCancel }) => {
  const { notify } = useToast()
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  // check what is missing here, then let the server check the rest and show its answers next to the fields
  const save = async () => {
    setFormError(null)

    const missing = {}
    if (!name.trim()) missing.group_name = 'Name is required.'
    if (!category.trim()) missing.category = 'Choose a category.'
    setErrors(missing)
    if (Object.keys(missing).length > 0) return

    setBusy(true)
    try {
      const created = await GroupsAPI.createGroup({ group_name: name.trim(), category: category.trim(), description: description.trim(), group_image_url: '' })
      notify('Group created.')
      onCreated(created)
    } catch (failure) {
      setErrors(failure.details ?? {})
      setFormError(failure.message)
      setBusy(false)
    }
  }

  return (
    <div className="quick-add">
      <h3>New group</h3>
      <FormField id="quick_group_name" label="Group name" error={errors.group_name}>
        <input id="quick_group_name" value={name} onChange={(event) => setName(event.target.value)} />
      </FormField>
      <CategoryField id="quick_group_category" value={category} categories={categories} onChange={setCategory} error={errors.category} />
      <FormField id="quick_group_description" label="Group description (optional)" error={errors.description}>
        <textarea id="quick_group_description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
      </FormField>

      {formError && <ErrorMessage message={formError} />}

      <div className="form-actions">
        <button type="button" disabled={busy} onClick={save}>
          Save group
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default GroupQuickAdd
