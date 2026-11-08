import { useNavigate } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import GroupForm from '../components/GroupForm'
import Spinner from '../components/Spinner'
import { useToast } from '../context/ToastContext'
import CategoriesAPI from '../services/CategoriesAPI'
import GroupsAPI from '../services/GroupsAPI'
import { useLoad } from '../utils/useLoad'
import '../css/Forms.css'

// an empty group form
const BLANK_GROUP = { group_name: '', category: '', description: '', group_image_url: '' }

// the page where a host creates a group
const GroupCreate = () => {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { data: categories, error, loading, reload } = useLoad(() => CategoriesAPI.getCategories())

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} onRetry={reload} />

  // save the group, then show it
  const save = async (values) => {
    const created = await GroupsAPI.createGroup(values)
    notify('Group created.')
    navigate(`/groups/${created.group_id}`)
  }

  return (
    <section className="form-page">
      <h1>Create Group</h1>
      <GroupForm categories={categories} initialValues={BLANK_GROUP} submitLabel="Create Group" onSubmit={save} />
    </section>
  )
}

export default GroupCreate
