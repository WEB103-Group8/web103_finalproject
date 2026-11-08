import { useNavigate } from 'react-router-dom'

// go back to the page the person came from
const BackButton = () => {
  const navigate = useNavigate()

  return (
    <button type="button" className="back-button" onClick={() => navigate(-1)}>
      &larr; Back
    </button>
  )
}

export default BackButton
