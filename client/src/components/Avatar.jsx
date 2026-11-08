import '../css/Profile.css'

// a round picture of a person, or the first letter of their name when they have none
const Avatar = ({ name, imageUrl }) =>
  imageUrl ? <img className="avatar" src={imageUrl} alt="" /> : <span className="avatar avatar-letter">{name?.[0] ?? '?'}</span>

export default Avatar
