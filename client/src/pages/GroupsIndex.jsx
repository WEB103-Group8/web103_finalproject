import CreateButton from '../components/CreateButton'
import GroupCard from '../components/GroupCard'
import ListBrowser from '../components/ListBrowser'
import GroupsAPI from '../services/GroupsAPI'
import '../css/ListPage.css'

// browse groups: anyone can look, and logging in is only asked for when they press Join on a group
const GroupsIndex = () => (
  <section className="list-page">
    <div className="page-heading">
      <h1>Groups</h1>
      <CreateButton to="/groups/new">Create Group</CreateButton>
    </div>
    <ListBrowser loadItems={GroupsAPI.getGroups} renderItem={(group) => <GroupCard group={group} />} getKey={(group) => group.group_id} noun="group" />
  </section>
)

export default GroupsIndex
