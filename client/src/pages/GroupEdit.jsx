import { Link, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import ErrorMessage from '../components/ErrorMessage'
import GroupForm from '../components/GroupForm'
import Spinner from '../components/Spinner'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import CategoriesAPI from '../services/CategoriesAPI'
import GroupsAPI from '../services/GroupsAPI'
import { useLoad } from '../utils/useLoad'
import NotFound from './NotFound'
import '../css/Forms.css'

// the page where a host edits one of their own groups
const GroupEdit = () => {
  const { groupId } = useParams()
  const { user } = useSession()
  const navigate = useNavigate()
  const { notify } = useToast()

  const { data, error, notFound, loading, reload } = useLoad(
    async () => {
      const [group, categories] = await Promise.all([GroupsAPI.getGroup(groupId), CategoriesAPI.getCategories()])
      return { group, categories }
    },
    [groupId],
  )

  if (loading) return <Spinner />
  if (notFound) return <NotFound />

  if (error) {
    return (
      <div className="form-page">
        <BackButton />
        <ErrorMessage message={error} onRetry={reload} />
      </div>
    )
  }

  const { group, categories } = data

  // hosts can only edit their own groups
  if (group.organizer_id !== user.user_id) {
    return (
      <section className="blocked-page">
        <h1>Not available</h1>
        <p>You can only edit groups you organize.</p>
        <Link to={`/groups/${groupId}`}>Back to the group</Link>
      </section>
    )
  }

  const initialValues = {
    group_name: group.group_name,
    category: group.category,
    description: group.description ?? '',
    group_image_url: group.group_image_url ?? '',
  }

  // save the changes, then show the group
  const save = async (values) => {
    await GroupsAPI.updateGroup(group.group_id, values)
    notify('Group updated.')
    navigate(`/groups/${group.group_id}`)
  }

  return (
    <section className="form-page">
      <h1>Edit Group</h1>
      <GroupForm categories={categories} initialValues={initialValues} submitLabel="Save changes" onSubmit={save} />
    </section>
  )
}

export default GroupEdit
