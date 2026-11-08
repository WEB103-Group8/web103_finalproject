import { Link } from 'react-router-dom'
import '../css/Cards.css'

// one group as a card: cover, name, category and member count
const GroupCard = ({ group }) => (
  <Link to={`/groups/${group.group_id}`} className="card group-card">
    {group.group_image_url && <img src={group.group_image_url} alt="" loading="lazy" />}
    <div className="card-body">
      <h3>{group.group_name}</h3>
      <p>{group.category}</p>
      <p>{group.member_count === 1 ? '1 member' : `${group.member_count} members`}</p>
    </div>
  </Link>
)

export default GroupCard
